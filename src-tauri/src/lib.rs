use std::collections::HashMap;
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

/// État d'une session Claude Code active, tel que vu par le dernier hook reçu.
struct SessionState {
    animation: String,
    event_name: String,
    tool_name: Option<String>,
    notification_type: Option<String>,
    last_event_at: Instant,
}

type Sessions = Arc<Mutex<HashMap<String, SessionState>>>;

#[derive(Clone)]
struct ServerState {
    app_handle: AppHandle,
    sessions: Sessions,
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
const STATE_PRIORITY: &[&str] = &[
    "working", "searching", "confused", "celebrate", "thinking", "listening", "idle", "bored",
    "sleeping",
];

/// Résout l'état agrégé affiché par le pet à partir de toutes les sessions actives, ainsi que
/// le hook/outil de la session qui a produit cet état (pour l'overlay debug -- sinon le hook
/// affiché peut venir d'une session dont l'animation a perdu la priorité, ce qui semble
/// contradictoire alors que l'agrégat est correct).
/// Priorité : working > searching > confused > celebrate > thinking > listening >
/// idle > bored > sleeping (une session `idle_prompt` reste "sleeping" même face à une
/// autre session "bored" moins profondément inactive) ; `sleeping` aussi si plus aucune
/// session (early return ci-dessous). "waking" n'apparaît plus dans cette liste : plus
/// aucun event ne le produit depuis la correction du 2026-08-25 (cf. animation_for_event()).
fn resolve_state(sessions: &HashMap<String, SessionState>) -> (&'static str, Option<&SessionState>) {
    if sessions.is_empty() {
        return ("sleeping", None);
    }

    for &candidate in STATE_PRIORITY {
        if let Some(session) = sessions.values().find(|s| effective_animation(s) == candidate) {
            return (candidate, Some(session));
        }
    }

    // Inatteignable tant que STATE_PRIORITY reste exhaustive (garde-fou pour le compilateur,
    // pas un comportement voulu -- cf. commentaire sur STATE_PRIORITY).
    ("bored", sessions.values().next())
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
    sessions: &HashMap<String, SessionState>,
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

    let (resolved, source_event, source_tool, source_notification) = {
        // Mutex empoisonné (panic d'un autre thread pendant le lock) -> on récupère quand
        // même les données plutôt que de paniquer à notre tour dans le handler HTTP.
        let mut sessions = state
            .sessions
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());

        if event_name == "SessionEnd" {
            sessions.remove(&session_id);
        } else if let Some(animation) = animation_for_event(event_name, tool_name, notification_type) {
            sessions.insert(
                session_id,
                SessionState {
                    animation: animation.to_string(),
                    event_name: event_name.to_string(),
                    tool_name: tool_name.map(str::to_string),
                    notification_type: notification_type.map(str::to_string),
                    last_event_at: Instant::now(),
                },
            );
        }

        resolve_full_state(&sessions)
    };

    // lastEvent/toolName/notificationType : identifient précisément le hook affiché (pas
    // seulement son animation agrégée) -- utilisés par le frontend pour choisir l'icône du
    // badge (cf. animationCatalog.findMappingEntry) en plus du mode debug. Reflètent le
    // hook de la session qui a produit l'état affiché (pas forcément celle de cette
    // requête, l'agrégat peut être dominé par une autre session), absents quand plus
    // aucune session (sleeping).
    let _ = state.app_handle.emit(
        "hooky-state",
        serde_json::json!({
            "state": resolved,
            "lastEvent": source_event,
            "toolName": source_tool,
            "notificationType": source_notification,
        }),
    );

    // Les hooks "http" de Claude Code exigent un corps de réponse JSON valide
    // (un simple texte "ok" est rejeté : "must return JSON, but got non-JSON response").
    Json(serde_json::json!({}))
}

/// Repositionne la fenêtre dans le coin bas-droit de l'écran principal (position par défaut).
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
fn spawn_idle_reaper(sessions: Sessions, app_handle: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut ticker = tokio::time::interval(REAPER_INTERVAL);
        let mut last_emitted: Option<String> = None;
        loop {
            ticker.tick().await;

            let (resolved, event_name, tool_name, notification_type) = {
                let mut guard = sessions.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
                guard.retain(|_, s| s.last_event_at.elapsed() < IDLE_TIMEOUT);
                resolve_full_state(&guard)
            };

            if last_emitted.as_deref() != Some(resolved) {
                last_emitted = Some(resolved.to_string());
                let _ = app_handle.emit(
                    "hooky-state",
                    serde_json::json!({
                        "state": resolved,
                        "lastEvent": event_name,
                        "toolName": tool_name,
                        "notificationType": notification_type,
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let sessions: Sessions = Arc::new(Mutex::new(HashMap::new()));

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
        .invoke_handler(tauri::generate_handler![write_text_file])
        .setup(move |app| {
            let app_handle = app.handle().clone();

            // --- Tray icon : "Recentrer la fenêtre" + "Quitter" ---
            let recenter_item =
                MenuItem::with_id(app, "recenter", "Recentrer la fenêtre", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quitter", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&recenter_item, &quit_item])?;

            let tray_icon = app
                .default_window_icon()
                .cloned()
                .ok_or("icône par défaut introuvable pour le tray")?;

            TrayIconBuilder::new()
                .icon(tray_icon)
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "quit" => app.exit(0),
                    "recenter" => recenter_window(app),
                    _ => {}
                })
                .build(app)?;

            // Clones pris avant que `server_state` ne consomme `app_handle`/`sessions`.
            let reaper_sessions = sessions.clone();
            let reaper_handle = app_handle.clone();

            // --- Serveur axum local : réceptionne les hooks Claude Code ---
            let server_state = ServerState {
                app_handle,
                sessions,
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
            spawn_idle_reaper(reaper_sessions, reaper_handle);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
