use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use axum::extract::State;
use axum::routing::post;
use axum::{Json, Router};
use serde_json::Value;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition};
use tower_http::cors::CorsLayer;

const SERVER_PORT: u16 = 4242;
const NO_SESSION_KEY: &str = "_no_session";
// ponytail: seuil fixe, pas de config exposée tant qu'un vrai besoin de le régler ne se présente pas.
const IDLE_TIMEOUT: Duration = Duration::from_secs(300);
const BORED_TIMEOUT: Duration = Duration::from_secs(90);
const REAPER_INTERVAL: Duration = Duration::from_secs(10);
// Deux hooks distincts peuvent représenter la MÊME intention côté Claude Code (ex:
// "Notification" notification_type=elicitation_dialog ET l'event "Elicitation", cf.
// docs/EVENTS.md "même intention que l'event Elicitation") et arriver quasi simultanément
// -- sans ce garde-fou, chacun réémet indépendamment `hooky-state` avec EXACTEMENT le même
// resolved/lastEvent/notificationType, ce qui rejoue l'animation (bounce/confettis, cf.
// useAnimationEffects) deux fois pour un seul événement perçu. Une vraie répétition (ex:
// deux `Stop` réels à quelques secondes d'écart) reste hors de cette fenêtre et continue
// de rejouer normalement -- ponytail: fenêtre fixe, pas de config exposée pour ce cas rare.
const DUPLICATE_EMIT_WINDOW: Duration = Duration::from_millis(500);

// Numéro de séquence joint à chaque émission `hooky-state` -- côté front (useHookyState),
// `revision` reflète directement cette valeur au lieu d'un `prev.revision + 1` local.
// React.StrictMode double-invoque le setup de l'effet `listen()` (mount -> cleanup ->
// remount) : le cleanup ne peut désabonner le PREMIER listener qu'après résolution de sa
// promesse, laissant une brève fenêtre où deux listeners réels sont actifs. Si UNE seule
// émission Rust arrive dans cette fenêtre, elle est reçue deux fois côté JS -- avec un
// compteur local (`+1`), ça produisait deux valeurs `revision` DIFFÉRENTES (deux rendus,
// donc deux sons/bulles pour un seul Stop réel, confirmé par le log `[hooky-debug]` --
// un seul `Stop` reçu ici). Avec un numéro de séquence fourni par le backend, les deux
// livraisons portent la MÊME valeur -- le front peut alors les dédupliquer (`prev` inchangé
// -> pas de re-render).
static EMIT_SEQUENCE: AtomicU64 = AtomicU64::new(0);

fn next_sequence() -> u64 {
    EMIT_SEQUENCE.fetch_add(1, Ordering::Relaxed) + 1
}

/// État d'une session Claude Code active, tel que vu par le dernier hook reçu.
struct SessionState {
    animation: String,
    event_name: String,
    tool_name: Option<String>,
    notification_type: Option<String>,
    last_event_at: Instant,
}

// Clé composite (session_id, agent_id) : un sous-agent (Task explicite ou fork système --
// auto-mémoire, résumé, suggestion -- cf. doc hooks officielle "agent_id ... populated when
// the hook fires inside a subagent") partage le session_id de la session parente mais porte
// son propre agent_id. Sans distinguer les deux, un SubagentStop tardif écrase l'état
// "celebrate" du Stop parent (même clé = même entrée). Avec une entrée par (session_id,
// agent_id), STATE_PRIORITY fait déjà le tri entre les deux (celebrate > idle) sans logique
// ad-hoc supplémentaire.
type SessionKey = (String, Option<String>);
type SessionMap = HashMap<SessionKey, SessionState>;
type Sessions = Arc<Mutex<SessionMap>>;

// (state, lastEvent, toolName, notificationType) -- cf. DUPLICATE_EMIT_WINDOW.
type EmissionSignature = (String, Option<String>, Option<String>, Option<String>);
type LastEmission = Arc<Mutex<Option<(EmissionSignature, Instant)>>>;

#[derive(Clone)]
struct ServerState {
    app_handle: AppHandle,
    sessions: Sessions,
    last_emission: LastEmission,
}

// Étape 6 : outils de recherche -> animation "searching" plutôt que "working" générique.
const SEARCH_TOOLS: &[&str] = &["Grep", "WebSearch", "Glob", "WebFetch"];

/// Table de correspondance events Claude Code -> animations : voir docs/EVENTS.md
/// (source de vérité, tenue à jour manuellement en miroir de ce match).
/// `tool_name` n'est consulté que pour `PreToolUse` (granularité working/searching),
/// `notification_type` seulement pour `Notification` (granularité listening/idle/bored).
fn animation_for_event(
    event_name: &str,
    tool_name: Option<&str>,
    notification_type: Option<&str>,
) -> Option<&'static str> {
    match event_name {
        // "waking" utilisé initialement (transition depuis sleeping) -- corrigé en
        // "listening" après validation visuelle (2026-08-25) : le rendu ne se
        // distinguait pas assez de idle, "listening" (attente du premier prompt) est
        // plus cohérent avec ce que l'animation montre réellement.
        "SessionStart" => Some("listening"),
        "UserPromptSubmit" => Some("thinking"),
        "PreToolUse" => {
            if tool_name.is_some_and(|name| SEARCH_TOOLS.contains(&name)) {
                Some("searching")
            } else {
                Some("working")
            }
        }
        "PostToolUse" => Some("idle"),
        "PostToolUseFailure" => Some("confused"),
        // 12 valeurs documentées (hooks.md, table "Matcher patterns") -- toutes couvertes
        // explicitement, cf. docs/EVENTS.md pour le détail du raisonnement par valeur.
        "Notification" => Some(match notification_type {
            // Attend une décision utilisateur -- même intention que l'event PermissionRequest.
            Some("permission_prompt") => "listening",
            // Un serveur MCP attend une réponse (formulaire ou ouverture d'URL) -- même
            // intention que l'event Elicitation.
            Some("elicitation_dialog" | "elicitation_url_dialog") => "listening",
            // L'échange MCP vient de se conclure (formulaire soumis/fermé, réponse envoyée)
            // -- retour à un état neutre, pas une attente active.
            Some("elicitation_complete" | "elicitation_response") => "idle",
            // Un sous-agent attend une entrée utilisateur -- même intention que permission_prompt.
            Some("agent_needs_input") => "listening",
            // Un sous-agent a terminé (succès OU échec, non distinguable ici) -- même
            // traitement neutre que l'event SubagentStop, pas de "confused" sur un simple bundle
            // succès/échec indifférencié.
            Some("agent_completed") => "idle",
            // Claude Code reprend le travail après une pause quota -- "waking" utilisé
            // initialement, corrigé en "bored" après validation visuelle (2026-08-25) :
            // le rendu lisait plus comme une inactivité qu'un réveil actif.
            Some("quota_auto_resume_fired") => "bored",
            // Le quota s'est réinitialisé pendant une pause de plus de 30 min -- signal
            // d'inactivité prolongée, même famille que idle_prompt.
            Some("quota_auto_resume_stale") => "bored",
            // Claude Code abandonne l'attente sans reprendre -- bloqué, a besoin d'une action
            // utilisateur pour repartir.
            Some("quota_auto_resume_disabled") => "listening",
            // Claude Code signale lui-même une session sans réponse depuis un moment -- signal
            // d'inactivité prolongée plus fort qu'un simple "bored" (auto-détecté par Claude
            // Code lui-même, pas juste par notre propre BORED_TIMEOUT) : "sleeping" (zzz).
            Some("idle_prompt") => "sleeping",
            // Une action vient de se conclure avec succès (ex. login MCP) -- retour à un état
            // neutre, pas une attente active. "auth_success" est un succès ponctuel isolé,
            // pas la conclusion d'une tâche -- "idle" reste le bon choix ici (contrairement à
            // `Stop`, cf. juste en dessous).
            Some("auth_success") => "idle",
            // Type inconnu/absent (futur ajout côté Claude Code non encore mappé ici) -- repli
            // sur le comportement générique précédent.
            _ => "listening",
        }),
        // Claude vient de terminer de répondre -- seul moment qui marque une vraie fin de
        // tâche (contrairement à PostToolUse/SubagentStop/PostCompact, qui restent "idle" :
        // simples pauses entre deux actions dans un flux toujours en cours). Retombe sur
        // "bored" après BORED_TIMEOUT sans nouvel event, comme "idle" (cf. effective_animation).
        "Stop" => Some("celebrate"),
        "StopFailure" => Some("confused"),
        "SubagentStart" => Some("working"),
        "SubagentStop" => Some("idle"),
        "PreCompact" => Some("thinking"),
        "PostCompact" => Some("idle"),
        "PermissionRequest" => Some("listening"),
        "Elicitation" => Some("listening"),
        // ponytail: event inconnu/non mappé -> ignoré sans erreur, pas de session mutée
        _ => None,
    }
}

/// Une session `idle`/`celebrate` depuis plus de BORED_TIMEOUT sans être encore évincée
/// (IDLE_TIMEOUT) affiche `bored` -- signal réel (temps écoulé), pas un état inventé sans
/// déclencheur. Reprend l'intention déjà notée dans le brief initial ("bored/drowsy :
/// inactivité prolongée avant sleeping") ; `celebrate` (fin de tâche via `Stop`) suit la même
/// règle pour ne pas rester figé indéfiniment si personne ne relance une session.
fn effective_animation(session: &SessionState) -> &str {
    if matches!(session.animation.as_str(), "idle" | "celebrate")
        && session.last_event_at.elapsed() >= BORED_TIMEOUT
    {
        "bored"
    } else {
        session.animation.as_str()
    }
}

// Doit couvrir CHAQUE valeur que animation_for_event()/effective_animation() peuvent
// produire (cf. LRN-007 en mémoire projet) -- une valeur absente ici retombe
// silencieusement sur le fallback de fin de fonction, sans erreur ni log.
// N'arbitre plus QU'entre le parent d'une session et ses sous-agents (cf. resolve_state) --
// comparer des sessions différentes par cette seule priorité masquait une session qui
// démarre activement (ex: SessionStart -> "listening") derrière un état "au repos"
// (celebrate/idle/bored) d'une AUTRE session qui vient juste de finir, uniquement parce
// qu'il est plus haut dans cette liste -- bug rapporté (2026-08-25) : n'importe quelle
// dernière animation jouée "collait" à l'affichage au démarrage d'une nouvelle session.
const STATE_PRIORITY: &[&str] = &[
    "working", "searching", "confused", "celebrate", "thinking", "listening", "idle", "bored",
    "sleeping",
];

/// Résout l'état agrégé affiché par le pet à partir de toutes les sessions actives, ainsi que
/// le hook/outil de la session qui a produit cet état (pour l'overlay debug -- sinon le hook
/// affiché peut venir d'une session dont l'animation a perdu la priorité, ce qui semble
/// contradictoire alors que l'agrégat est correct).
///
/// Deux niveaux, volontairement différents :
/// 1. Intra-session (un `session_id` + ses sous-agents, cf. SessionKey) : STATE_PRIORITY
///    décide de l'état représentatif -- un `SubagentStop` (vrai sous-agent ou fork système)
///    ne doit jamais masquer le `celebrate` de son propre parent.
/// 2. Inter-sessions (des `session_id` différents) : c'est la session la PLUS RÉCEMMENT
///    ACTIVE (max de `last_event_at` parmi ses entrées) qui gagne, pas la priorité globale
///    -- une session qui démarre est par nature plus pertinente qu'une autre restée
///    silencieuse depuis quelques secondes, même si son animation est "moins prioritaire"
///    dans l'absolu (STATE_PRIORITY n'a de sens qu'entre un parent et SES PROPRES
///    sous-agents, pas pour arbitrer entre deux sessions sans rapport).
///
/// `sleeping` si plus aucune session (early return ci-dessous). "waking" n'apparaît plus
/// dans STATE_PRIORITY : plus aucun event ne le produit depuis la correction du
/// 2026-08-25 (cf. animation_for_event()).
fn resolve_state(sessions: &SessionMap) -> (&'static str, Option<&SessionState>) {
    if sessions.is_empty() {
        return ("sleeping", None);
    }

    let mut groups: HashMap<&str, Vec<&SessionState>> = HashMap::new();
    for ((session_id, _agent_id), state) in sessions {
        groups.entry(session_id.as_str()).or_default().push(state);
    }

    groups
        .into_values()
        .filter_map(|states| {
            let (label, winner) = STATE_PRIORITY.iter().find_map(|&candidate| {
                states
                    .iter()
                    .find(|s| effective_animation(s) == candidate)
                    .map(|s| (candidate, *s))
            })?;
            let most_recent_in_session = states.iter().map(|s| s.last_event_at).max()?;
            Some((label, winner, most_recent_in_session))
        })
        .max_by_key(|&(_, _, most_recent_in_session)| most_recent_in_session)
        .map(|(label, winner, _)| (label, Some(winner)))
        // Inatteignable tant que STATE_PRIORITY reste exhaustive et que `sessions` est
        // non-vide (garde-fou pour le compilateur, pas un comportement voulu).
        .unwrap_or(("bored", sessions.values().next()))
}

/// Résout l'état affiché + les champs identifiant précisément le hook qui l'a produit
/// (lastEvent/toolName/notificationType) -- factorisé entre `on_event` et
/// `spawn_idle_reaper` : avant, le reaper réémettait `{state}` seul dès qu'il détectait
/// un changement, quel qu'il soit (y compris une simple désynchronisation de son propre
/// suivi interne `last_emitted`, jamais recalé sur les émissions de `on_event`) --
/// écrasant `lastEvent` à `undefined` côté frontend dans les ~REAPER_INTERVAL (10s)
/// suivant n'importe quel event, sans que l'animation elle-même n'ait changé. Symptôme :
/// le badge/icône (qui dépend de `lastEvent`, cf. animationCatalog.findMappingEntry)
/// disparaissait alors que l'animation restait active.
fn resolve_full_state(
    sessions: &SessionMap,
) -> (&'static str, Option<String>, Option<String>, Option<String>) {
    let (resolved, session) = resolve_state(sessions);
    (
        resolved,
        session.map(|s| s.event_name.clone()),
        session.and_then(|s| s.tool_name.clone()),
        session.and_then(|s| s.notification_type.clone()),
    )
}

async fn on_event(State(state): State<ServerState>, Json(payload): Json<Value>) -> Json<Value> {
    let session_id = payload
        .get("session_id")
        .and_then(Value::as_str)
        .unwrap_or(NO_SESSION_KEY)
        .to_string();

    let event_name = payload
        .get("hook_event_name")
        .and_then(Value::as_str)
        .unwrap_or("");

    let tool_name = payload.get("tool_name").and_then(Value::as_str);
    let notification_type = payload.get("notification_type").and_then(Value::as_str);
    // Cf. commentaire sur SessionKey : distingue le parent (agent_id absent) de ses
    // sous-agents (Task explicite ou fork système) pour ne pas écraser leurs états respectifs.
    let agent_id = payload
        .get("agent_id")
        .and_then(Value::as_str)
        .map(str::to_string);
    let agent_type = payload.get("agent_type").and_then(Value::as_str);
    // Un fork système invisible (recap, auto-mémoire, suggestion -- cf. LRN-023) partage le
    // session_id/agent_id d'un vrai sous-agent mais garde agent_type vide (""), contrairement
    // à un sous-agent explicite (Task/Explore/...) qui porte un type nommé. Sans ce filtre,
    // le SubagentStop d'un recap ravive last_event_at du groupe avec "idle" -- prioritaire sur
    // "bored" dans STATE_PRIORITY -- masquant le `celebrate` du Stop parent le temps que cette
    // entrée fantôme décroisse à son tour, et retarde `sleeping` de tout ce délai.
    let is_invisible_fork = agent_id.is_some() && agent_type.is_none_or(str::is_empty);
    let key = (session_id.clone(), agent_id);

    // Vrai seulement si CETTE requête a réellement changé `sessions` (insertion ou purge
    // qui retire au moins une entrée) -- cf. usage plus bas : sans ce flag, un event qui ne
    // mute rien (fork invisible, écho de Stop) pouvait quand même redéclencher un emit dès
    // que `should_emit` (fenêtre de 500ms) considérait assez de temps écoulé depuis la
    // dernière émission du MÊME tuple resolved -- alors que rien de neuf ne s'était produit.
    let mut mutated = false;

    let (resolved, source_event, source_tool, source_notification) = {
        // Mutex empoisonné (panic d'un autre thread pendant le lock) -> on récupère quand
        // même les données plutôt que de paniquer à notre tour dans le handler HTTP.
        let mut sessions = state
            .sessions
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());

        if event_name == "SessionEnd" {
            // Purge toutes les entrées de ce session_id, y compris celles de ses
            // sous-agents (SessionEnd n'a lui-même pas d'agent_id) -- sinon une entrée
            // sous-agent orpheline continuerait à peser sur l'agrégat jusqu'à IDLE_TIMEOUT.
            let before = sessions.len();
            sessions.retain(|(sid, _), _| sid != &session_id);
            mutated = sessions.len() != before;
        } else if is_invisible_fork {
            // ponytail: rien à faire, l'event est simplement ignoré (ni insertion ni maj).
        } else if event_name == "Stop"
            && sessions
                .get(&key)
                .is_some_and(|existing| existing.animation == "celebrate")
        {
            // Un "Stop" qui arrive alors que CETTE session (même session_id, même absence
            // d'agent_id) est DÉJÀ en "celebrate" -- donc sans qu'aucun event réel
            // (UserPromptSubmit/PreToolUse/PostToolUse/...) ne soit venu changer son
            // animation entre les deux -- est très probablement l'écho d'un fork système
            // invisible (mémoire auto, résumé, suggestion) qui partage le session_id du
            // parent SANS agent_id du tout, donc indétectable par `is_invisible_fork`
            // ci-dessus (qui ne sait filtrer que sur agent_id/agent_type). Constaté
            // empiriquement (2026-08-29, cf. mémoire projet) : deux "Stop" consécutifs pour
            // le même session_id sans rien entre les deux, causant un 2e son/bulle
            // "celebrate" pour une seule tâche réellement terminée. Une vraie 2e complétion
            // a TOUJOURS une activité réelle entre les deux Stop (elle fait forcément
            // repasser `animation` par thinking/working/idle avant de revenir à celebrate),
            // donc ce garde-fou ne bloque jamais un Stop légitime.
            // ponytail: rien à faire, l'event est simplement ignoré (ni insertion ni maj).
        } else if let Some(animation) = animation_for_event(event_name, tool_name, notification_type) {
            sessions.insert(
                key,
                SessionState {
                    animation: animation.to_string(),
                    event_name: event_name.to_string(),
                    tool_name: tool_name.map(str::to_string),
                    notification_type: notification_type.map(str::to_string),
                    last_event_at: Instant::now(),
                },
            );
            mutated = true;
        }

        resolve_full_state(&sessions)
    };

    // `mutated` d'abord (cf. commentaire plus haut) : sans changement réel, pas d'emit,
    // peu importe le temps écoulé. Puis DUPLICATE_EMIT_WINDOW -- deux hooks distincts pour
    // la même intention (arrivés quasi simultanément, chacun mutant réellement la map) ne
    // doivent réémettre qu'une fois.
    let should_emit = mutated && {
        let signature: EmissionSignature = (
            resolved.to_string(),
            source_event.clone(),
            source_tool.clone(),
            source_notification.clone(),
        );
        let mut last = state
            .last_emission
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        let is_duplicate = last
            .as_ref()
            .is_some_and(|(sig, at)| *sig == signature && at.elapsed() < DUPLICATE_EMIT_WINDOW);
        *last = Some((signature, Instant::now()));
        !is_duplicate
    };

    // lastEvent/toolName/notificationType : identifient précisément le hook affiché (pas
    // seulement son animation agrégée) -- utilisés par le frontend pour choisir l'icône du
    // badge (cf. animationCatalog.findMappingEntry) en plus du mode debug. Reflètent le
    // hook de la session qui a produit l'état affiché (pas forcément celle de cette
    // requête, l'agrégat peut être dominé par une autre session), absents quand plus
    // aucune session (sleeping).
    if should_emit {
        let _ = state.app_handle.emit(
            "hooky-state",
            serde_json::json!({
                "state": resolved,
                "lastEvent": source_event,
                "toolName": source_tool,
                "notificationType": source_notification,
                "sequence": next_sequence(),
            }),
        );
    }

    // Les hooks "http" de Claude Code exigent un corps de réponse JSON valide
    // (un simple texte "ok" est rejeté : "must return JSON, but got non-JSON response").
    Json(serde_json::json!({}))
}

/// Repositionne la fenêtre dans le coin bas-droit de l'écran principal (position par défaut).
/// ponytail: plus appelée depuis le tray (remplacé par "Paramètres", cf. setup()) -- gardée
/// telle quelle (pas supprimée) en cas de réintroduction future d'une action de recentrage
/// dans l'UI ; `#[allow(dead_code)]` évite le warning `cargo check` en attendant.
#[allow(dead_code)]
fn recenter_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let Ok(Some(monitor)) = window.current_monitor() else {
        return;
    };
    let Ok(win_size) = window.outer_size() else {
        return;
    };

    const MARGIN: i32 = 20;
    let screen_size = monitor.size();
    let x = screen_size.width as i32 - win_size.width as i32 - MARGIN;
    let y = screen_size.height as i32 - win_size.height as i32 - MARGIN;

    let _ = window.set_position(PhysicalPosition::new(x.max(0), y.max(0)));
}

/// Étape 4 : retire les sessions inactives depuis IDLE_TIMEOUT (équivalent d'un SessionEnd
/// implicite, couvre le cas d'une session qui ne renvoie jamais SessionEnd) et réémet
/// l'état résolu dès qu'il change -- y compris la transition idle -> bored, qui ne
/// change rien à la map elle-même (juste au temps écoulé).
///
/// Partage `last_emission` avec `on_event` (PAS un suivi local séparé, cf. bug ci-dessous)
/// -- mais l'exploite différemment : ici, un signature IDENTIQUE au dernier annoncé est
/// TOUJOURS ignoré, peu importe le temps écoulé (contrairement à `on_event`, qui tolère un
/// signature identique après DUPLICATE_EMIT_WINDOW pour rejouer un vrai second Stop réel).
/// Le reaper ne "sait" jamais qu'un nouvel event réel est survenu -- il ne fait que
/// ré-observer l'agrégat périodiquement, donc un signature inchangé signifie littéralement
/// que rien de neuf ne s'est produit depuis la dernière annonce (par lui-même OU par
/// `on_event`), quel que soit l'écart de temps.
///
/// Avant ce partage, le reaper gardait son PROPRE `last_emitted: Option<String>` local,
/// jamais synchronisé avec `state.last_emission` : dès qu'`on_event` annonçait un état (ex:
/// "celebrate" sur un vrai Stop), le PROCHAIN tick du reaper (jusqu'à REAPER_INTERVAL
/// après) le trouvait "nouveau" de SON propre point de vue et le réannonçait -- un
/// deuxième "Stop"/son/bulle pour une seule tâche réellement terminée, invisible dans des
/// logs consultés juste après le premier Stop (décalé de quelques secondes). Bug signalé
/// et diagnostiqué le 2026-08-29 (cf. mémoire projet) -- survivait à toute correction côté
/// `on_event` puisque le reaper ne passait jamais par ce chemin.
fn spawn_idle_reaper(sessions: Sessions, app_handle: AppHandle, last_emission: LastEmission) {
    tauri::async_runtime::spawn(async move {
        let mut ticker = tokio::time::interval(REAPER_INTERVAL);
        loop {
            ticker.tick().await;

            let (resolved, event_name, tool_name, notification_type) = {
                let mut guard = sessions.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
                guard.retain(|_, s| s.last_event_at.elapsed() < IDLE_TIMEOUT);
                resolve_full_state(&guard)
            };

            let signature: EmissionSignature = (
                resolved.to_string(),
                event_name.clone(),
                tool_name.clone(),
                notification_type.clone(),
            );
            let should_emit = {
                let mut last = last_emission
                    .lock()
                    .unwrap_or_else(|poisoned| poisoned.into_inner());
                let is_duplicate = last.as_ref().is_some_and(|(sig, _)| *sig == signature);
                if !is_duplicate {
                    *last = Some((signature, Instant::now()));
                }
                !is_duplicate
            };

            if should_emit {
                let _ = app_handle.emit(
                    "hooky-state",
                    serde_json::json!({
                        "state": resolved,
                        "lastEvent": event_name,
                        "toolName": tool_name,
                        "notificationType": notification_type,
                        "sequence": next_sequence(),
                    }),
                );
            }
        }
    });
}

/// Écrit `content` dans `path`. Commande applicative interne (pas un plugin) : pas de
/// scope à déclarer côté capabilities, contrairement à `fs:allow-write-text-file`. Le
/// chemin vient toujours du dialogue natif `save()` (`@tauri-apps/plugin-dialog`) côté
/// front -- l'utilisateur a déjà choisi/consenti l'emplacement avant l'appel.
#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(path, content).map_err(|e| e.to_string())
}

/// Racine des settings Claude Code globaux (`~/.claude/settings.json`) -- `USERPROFILE`
/// est l'équivalent Windows de `HOME`, cohérent avec le hook `SessionStart` embarqué qui
/// s'appuie déjà sur `$env:LOCALAPPDATA` de la même façon (cf. docs/hooks/README.md).
fn claude_settings_path() -> Result<std::path::PathBuf, String> {
    let profile = std::env::var("USERPROFILE")
        .map_err(|_| "variable d'environnement USERPROFILE introuvable".to_string())?;
    Ok(std::path::PathBuf::from(profile)
        .join(".claude")
        .join("settings.json"))
}

/// Racine des credentials OAuth Claude Code (`~/.claude/.credentials.json`) -- même base
/// que `claude_settings_path`, fichier distinct (token, pas config utilisateur).
fn claude_credentials_path() -> Result<std::path::PathBuf, String> {
    let profile = std::env::var("USERPROFILE")
        .map_err(|_| "variable d'environnement USERPROFILE introuvable".to_string())?;
    Ok(std::path::PathBuf::from(profile)
        .join(".claude")
        .join(".credentials.json"))
}

/// Lit le token OAuth local et interroge l'endpoint de quotas Claude Code (même endpoint
/// que le CLI officiel, cf. github.com/Ulrichfr/Claude-Marge-Widget qui l'a documenté en
/// premier). Retourne le JSON brut tel quel -- le formatage (labels, pourcentages, dates
/// de reset) reste côté front (`src/lib/usage.ts`), pas dupliqué dans un struct Rust qui
/// devrait suivre chaque évolution de la forme de la réponse. Fonction interne (pas une
/// commande) : seul `spawn_usage_poller` l'appelle, sur un timer -- le front ne déclenche
/// plus jamais ce fetch lui-même (cf. USAGE_POLL_INTERVAL, corrige le rate-limit constaté
/// quand chaque survol de l'avatar déclenchait son propre appel API en parallèle).
async fn fetch_usage() -> Result<Value, String> {
    let path = claude_credentials_path()?;
    let raw = std::fs::read_to_string(&path)
        .map_err(|e| format!("lecture de {} impossible : {e}", path.display()))?;
    let creds: Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
    let token = creds
        .get("claudeAiOauth")
        .and_then(|o| o.get("accessToken"))
        .and_then(Value::as_str)
        .ok_or("accessToken introuvable dans .credentials.json")?;

    let response = reqwest::Client::new()
        .get("https://api.anthropic.com/api/oauth/usage")
        .bearer_auth(token)
        .header("anthropic-beta", "oauth-2025-04-20")
        .header("User-Agent", "hooky")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("l'API usage a répondu {}", response.status()));
    }

    response.json::<Value>().await.map_err(|e| e.to_string())
}

/// Dernière réponse connue de `fetch_usage()` (succès ou `{"error": ...}`) -- managé comme
/// state Tauri (`app.manage`), lu par la commande `get_cached_usage`. Existe pour fermer
/// la course décrite sur `spawn_usage_poller` : le front lit ce cache une fois au montage
/// EN PLUS d'écouter `hooky-usage`, au lieu de dépendre uniquement d'un event qui a pu être
/// émis avant que quiconque écoute.
type LastUsage = Arc<Mutex<Option<Value>>>;

#[tauri::command]
fn get_cached_usage(state: tauri::State<LastUsage>) -> Option<Value> {
    state
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .clone()
}

/// Interroge `fetch_usage()` en boucle et émet le résultat sur `hooky-usage` -- écouté par
/// `useClaudeUsage` (front) pour peupler le panneau de quotas permanent (cf. UsagePanel,
/// Avatar.tsx). Une SEULE source de fetch peu importe le nombre de fenêtres ouvertes ou de
/// re-renders : contrairement à un fetch déclenché depuis le front (hover, mount...), rien
/// ne peut le dupliquer ou le spammer.
///
/// Premier appel IMMÉDIAT (boucle "fetch puis sleep", pas un `tokio::time::interval`) --
/// mais ce premier appel part si tôt qu'il peut se terminer AVANT que la fenêtre "main" ait
/// fini de monter son listener `hooky-usage` (webview encore en train de charger le bundle
/// JS) : Tauri ne rejoue jamais un event passé à un listener tardif (même piège déjà
/// rencontré sur ce projet pour la bulle de notification, cf. NotificationBubbleWindow) --
/// SANS le cache `LastUsage` mis à jour ici à chaque tick, ce premier résultat serait perdu
/// et le panneau resterait bloqué sur "Chargement…" jusqu'au tick suivant (3min plus tard --
/// exactement le symptôme constaté en usage réel). En cas d'échec (token expiré, API down,
/// rate-limit -- log `eprintln!` + payload `{"error": "..."}`, sans branche dédiée côté
/// front puisque `parseUsage` retombe déjà sur `null` par absence de `limits`), retente
/// après `USAGE_RETRY_INTERVAL` (15s) plutôt que d'attendre le plein cycle de 3min.
fn spawn_usage_poller(app_handle: AppHandle, last_usage: LastUsage) {
    const USAGE_POLL_INTERVAL: Duration = Duration::from_secs(180);
    const USAGE_RETRY_INTERVAL: Duration = Duration::from_secs(15);
    tauri::async_runtime::spawn(async move {
        loop {
            let (payload, ok) = match fetch_usage().await {
                Ok(data) => (data, true),
                Err(error) => {
                    eprintln!("[hooky-usage] fetch_usage a échoué : {error}");
                    (serde_json::json!({ "error": error }), false)
                }
            };
            *last_usage
                .lock()
                .unwrap_or_else(|poisoned| poisoned.into_inner()) = Some(payload.clone());
            let _ = app_handle.emit("hooky-usage", payload);
            tokio::time::sleep(if ok {
                USAGE_POLL_INTERVAL
            } else {
                USAGE_RETRY_INTERVAL
            })
            .await;
        }
    });
}

/// Snippet de hooks Hooky embarqué dans le binaire à la compilation -- fait partie du
/// repo (docs/hooks/claude-settings-snippet.json, source de vérité tenue à jour
/// manuellement), pas une donnée utilisateur : `include_str!` plutôt qu'une lecture
/// disque relative fragile (le binaire installé n'a pas le repo à côté de lui).
const CLAUDE_HOOKS_SNIPPET: &str = include_str!("../../docs/hooks/claude-settings-snippet.json");

/// Marqueur d'une entrée "possédée" par Hooky : toute entrée dont un des hooks cible le
/// port fixe 4242 (BDR-002, jamais réutilisé ailleurs) -- pas une comparaison de texte
/// exact, pour rester idempotent même quand le contenu de `CLAUDE_HOOKS_SNIPPET` évolue
/// d'une version de Hooky à l'autre (sinon : une commande légèrement modifiée ne matche
/// plus l'ancienne, et s'ajoute EN PLUS au lieu de la remplacer -- doublons qui
/// s'accumulent à chaque mise à jour, cf. régression constatée en test manuel).
fn is_hooky_entry(entry: &Value) -> bool {
    const MARKER: &str = "127.0.0.1:4242";
    entry
        .get("hooks")
        .and_then(Value::as_array)
        .is_some_and(|hooks| {
            hooks.iter().any(|h| {
                h.get("url")
                    .and_then(Value::as_str)
                    .is_some_and(|u| u.contains(MARKER))
                    || h.get("command")
                        .and_then(Value::as_str)
                        .is_some_and(|c| c.contains(MARKER))
            })
        })
}

/// Fusionne `CLAUDE_HOOKS_SNIPPET` dans `~/.claude/settings.json`, en préservant tout hook
/// déjà configuré (jamais d'écrasement de la clé "hooks" existante, ni des entrées d'un
/// autre outil pour le même event) -- remplace le geste manuel documenté dans
/// docs/hooks/README.md (désactiver l'attribut ReadOnly, fusionner event par event,
/// réactiver ReadOnly). Idempotent : pour chaque event, les entrées déjà "possédées" par
/// Hooky (`is_hooky_entry`) sont retirées puis remplacées par la version courante du
/// snippet -- un second clic (ou une mise à jour du snippet) ne duplique jamais rien,
/// contrairement à une comparaison par égalité de texte exact.
///
/// Retourne "installed" (fichier ou clé "hooks" absents avant), "merged" (ajouts/mises à
/// jour faits) ou "already_up_to_date" (rien à changer).
#[tauri::command]
fn install_claude_hooks() -> Result<String, String> {
    let path = claude_settings_path()?;

    let snippet: Value = serde_json::from_str(CLAUDE_HOOKS_SNIPPET).map_err(|e| e.to_string())?;
    let snippet_hooks = snippet
        .get("hooks")
        .and_then(Value::as_object)
        .ok_or("snippet embarqué invalide : pas de clé \"hooks\"")?;

    let file_existed = path.exists();
    let mut target: Value = if file_existed {
        let raw = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&raw)
            .map_err(|e| format!("~/.claude/settings.json existant est invalide : {e}"))?
    } else {
        serde_json::json!({})
    };
    let target_obj = target
        .as_object_mut()
        .ok_or("~/.claude/settings.json existant n'est pas un objet JSON")?;

    let hooks_existed = target_obj.contains_key("hooks");
    let hooks_value = target_obj
        .entry("hooks")
        .or_insert_with(|| Value::Object(serde_json::Map::new()));
    let hooks_obj = hooks_value
        .as_object_mut()
        .ok_or("clé \"hooks\" existante n'est pas un objet")?;

    let mut changed = false;
    for (event, entries) in snippet_hooks {
        let snippet_entries = entries.as_array().ok_or_else(|| {
            format!("snippet embarqué invalide : hooks.{event} n'est pas un tableau")
        })?;
        match hooks_obj.get_mut(event) {
            None => {
                hooks_obj.insert(event.clone(), Value::Array(snippet_entries.clone()));
                changed = true;
            }
            Some(existing) => {
                let existing_arr = existing.as_array_mut().ok_or_else(|| {
                    format!(
                        "~/.claude/settings.json existant : hooks.{event} n'est pas un tableau"
                    )
                })?;
                // Retire toute entrée déjà possédée par Hooky (versions précédentes du
                // snippet incluses) avant de réinsérer la version courante -- remplace,
                // n'accumule jamais (cf. `is_hooky_entry`).
                let mut new_arr: Vec<Value> = existing_arr
                    .iter()
                    .filter(|e| !is_hooky_entry(e))
                    .cloned()
                    .collect();
                new_arr.extend(snippet_entries.iter().cloned());
                if &new_arr != existing_arr {
                    *existing_arr = new_arr;
                    changed = true;
                }
            }
        }
    }

    if !changed {
        return Ok("already_up_to_date".to_string());
    }

    // Le fichier est souvent marqué ReadOnly (protection Claude Code contre une édition
    // accidentelle) -- désactivé le temps de l'écriture puis réactivé, comme le geste
    // manuel documenté dans docs/hooks/README.md. `std::fs::Permissions::set_readonly`
    // (std, déjà disponible) fait le job sur Windows sans dépendance supplémentaire.
    let was_readonly = std::fs::metadata(&path)
        .map(|m| m.permissions().readonly())
        .unwrap_or(false);
    if was_readonly {
        let mut perms = std::fs::metadata(&path)
            .map_err(|e| e.to_string())?
            .permissions();
        perms.set_readonly(false);
        std::fs::set_permissions(&path, perms).map_err(|e| e.to_string())?;
    }

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let pretty = serde_json::to_string_pretty(&target).map_err(|e| e.to_string())?;
    std::fs::write(&path, pretty).map_err(|e| e.to_string())?;

    if was_readonly {
        let mut perms = std::fs::metadata(&path)
            .map_err(|e| e.to_string())?
            .permissions();
        perms.set_readonly(true);
        std::fs::set_permissions(&path, perms).map_err(|e| e.to_string())?;
    }

    Ok(if file_existed && hooks_existed {
        "merged"
    } else {
        "installed"
    }
    .to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let sessions: Sessions = Arc::new(Mutex::new(HashMap::new()));
    let last_emission: LastEmission = Arc::new(Mutex::new(None));
    let last_usage: LastUsage = Arc::new(Mutex::new(None));

    tauri::Builder::default()
        // Doit être le premier plugin enregistré (contrainte du plugin single-instance).
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(last_usage.clone())
        .invoke_handler(tauri::generate_handler![
            write_text_file,
            install_claude_hooks,
            get_cached_usage
        ])
        .setup(move |app| {
            let app_handle = app.handle().clone();

            // --- Tray icon : "Paramètres" + "Quitter" ---
            let settings_item =
                MenuItem::with_id(app, "settings", "Paramètres", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quitter", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&settings_item, &quit_item])?;

            let tray_icon = app
                .default_window_icon()
                .cloned()
                .ok_or("icône par défaut introuvable pour le tray")?;

            TrayIconBuilder::new()
                .icon(tray_icon)
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "quit" => app.exit(0),
                    // Ouvrir/focus/toggle-minimize la fenêtre settings est déjà implémenté
                    // côté JS (cf. src/lib/settingsWindow.ts `openSettingsWindow`) -- pas
                    // dupliqué ici, on se contente de relayer l'intention via un event
                    // applicatif, écouté uniquement par la fenêtre "main" (cf. App.tsx).
                    "settings" => {
                        let _ = app.emit("hooky-open-settings", ());
                    }
                    _ => {}
                })
                .build(app)?;

            // Clones pris avant que `server_state` ne consomme `app_handle`/`sessions`/
            // `last_emission` -- ce dernier partagé avec le reaper (cf. spawn_idle_reaper).
            let reaper_sessions = sessions.clone();
            let reaper_handle = app_handle.clone();
            let reaper_last_emission = last_emission.clone();
            let usage_handle = app_handle.clone();
            let usage_last = last_usage.clone();

            // --- Serveur axum local : réceptionne les hooks Claude Code ---
            let server_state = ServerState {
                app_handle,
                sessions,
                last_emission,
            };
            // CORS permissif : la fenêtre settings appelle /event en fetch() depuis son
            // propre webview (onglet Animation, clic sur une carte pour tester en live) --
            // un fetch cross-origin est bloqué sans ces headers, contrairement aux vrais
            // hooks Claude Code qui posent en curl (pas de préflight CORS côté serveur HTTP
            // à HTTP). Serveur bindé sur 127.0.0.1 uniquement -- pas de risque d'exposition
            // externe à autoriser toute origine ici.
            let router = Router::new()
                .route("/event", post(on_event))
                .layer(CorsLayer::permissive())
                .with_state(server_state);

            tauri::async_runtime::spawn(async move {
                let addr = format!("127.0.0.1:{SERVER_PORT}");
                // La duplication d'instance est interceptée en amont par le plugin
                // single-instance : un échec de bind ici signale un vrai conflit de port
                // externe, cas qu'on ne peut pas résoudre proprement -> on panique.
                let listener = tokio::net::TcpListener::bind(&addr)
                    .await
                    .expect("échec du bind sur 127.0.0.1:4242 (port déjà utilisé par un autre process ?)");
                axum::serve(listener, router)
                    .await
                    .expect("le serveur axum a crashé");
            });

            // --- Étape 4 : sessions inactives depuis IDLE_TIMEOUT -> retirées, comme un
            // SessionEnd implicite (couvre le cas d'une session qui ne renvoie jamais
            // SessionEnd, ex. terminal fermé brutalement).
            spawn_idle_reaper(reaper_sessions, reaper_handle, reaper_last_emission);

            // --- Quotas Claude Code : poll indépendant du front (cf. spawn_usage_poller) --
            // tourne toujours, le réglage `usagePanelEnabled` ne fait que masquer/afficher
            // le panneau côté front sans arrêter/relancer ce timer (un GET toutes les 3min
            // est négligeable, éviter une commande de toggle dédiée).
            spawn_usage_poller(usage_handle, usage_last);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
