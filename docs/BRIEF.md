# Brief — Hooky, le mini desktop pet Claude Code (Tauri)

## Identité du projet — Hooky

**Nom retenu : Hooky.** Domaine `hooky.vercel.app` à vérifier en dernière
minute côté dashboard Vercel avant de le fixer (pas de garantie absolue tant
que le projet n'est pas créé).

**Lore/concept** : Hooky est une petite créature qui ne perçoit le monde
qu'à travers un seul canal — les _hooks_ de Claude Code. Elle ne voit pas le
code, elle ressent l'activité de l'agent à travers les events qui lui
arrivent (`PreToolUse`, `Notification`, `Stop`...), un peu comme des
impulsions nerveuses.

**Double sens du nom** :

- Sens technique : _hook_ = le mécanisme qui la nourrit en informations.
- Sens familier anglais : _"play hooky"_ = sécher les cours. Contre-pied
  volontaire — Hooky ne sèche jamais rien, elle est accrochée en permanence
  à l'activité de la session.

**Comportement narratif** : elle s'endort quand tu pars (`sleeping`), se
réveille en sursaut à ton retour (`waking`), plisse les yeux pendant que tu
tapes ton prompt (`thinking`), s'agite pendant que Claude bosse (`working`),
devient confuse ou grognon si un outil plante (`confused`/`angry`).

**Piste de tagline pour la LP** :

> _"Hooky ne code pas. Hooky regarde. Hooky réagit."_

ou, plus taquin :

> _"Elle a jamais séché un seul hook de sa vie."_

**Note technique** : le composant React reste nommé `Strobi` dans le code
source de `bible-strong-avatar-lab` (fichiers copiés tels quels, cf. section
moteur d'animation) — pas de renommage nécessaire en interne, `Hooky` reste
le nom du projet/produit exposé à l'utilisateur (LP, nom du repo, nom de
l'exécutable), pas forcément celui du composant technique sous-jacent.

## Contexte

`clawd-on-desk` (Electron) fait déjà le job mais avec une complexité multi-agents
(21+ CLI supportées, mini-mode, eye-tracking SVG scripté, import Codex Pet...) qui
dépasse largement le besoin. Objectif : une version maison, minimaliste, en Tauri,
avec un contrôle total sur le mapping events → animations et un eye-tracking souris
natif dès le départ.

## Objectif MVP

Un pet de bureau qui réagit en temps réel aux events du hook system de Claude Code
CLI, avec au moins 4 états animés (`idle`, `thinking`, `working`, `sleeping`) et
un tracking basique du regard sur la position de la souris.

## Architecture

```
┌─────────────────────┐      POST http://127.0.0.1:PORT/event      ┌──────────────────────────┐
│   Claude Code CLI    │ ───────────────────────────────────────▶  │   Tauri app (Rust)        │
│   (hooks settings)   │         JSON (hook_event_name, ...)        │   axum server (setup())   │
└─────────────────────┘                                             │   → app_handle.emit()     │
                                                                     └────────────┬──────────────┘
                                                                                  │ Tauri event
                                                                                  ▼
                                                                     ┌──────────────────────────┐
                                                                     │   Frontend (webview)      │
                                                                     │   TS + moteur d'animation │
                                                                     │   (inspiré bloub)         │
                                                                     └──────────────────────────┘
```

**Le serveur local démarre dans le `setup()` du `Builder` Tauri**, en tâche async
sur le runtime tokio déjà présent (pas de process séparé, pas de sidecar Node à
bundler). Il vit et meurt avec l'app :

```rust
// src-tauri/src/lib.rs
use tauri::{Manager, Emitter};
use axum::{routing::post, Router, extract::State, Json};
use std::sync::Arc;
use serde_json::Value;

#[derive(Clone)]
struct ServerState {
    app_handle: tauri::AppHandle,
}

async fn on_event(State(state): State<Arc<ServerState>>, Json(payload): Json<Value>) -> &'static str {
    // debounce + mapping fait ici ou délégué au frontend via emit brut
    let _ = state.app_handle.emit("cc-hook-event", payload);
    "ok"
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let state = Arc::new(ServerState { app_handle: app.handle().clone() });
            let router = Router::new()
                .route("/event", post(on_event))
                .with_state(state);

            tauri::async_runtime::spawn(async move {
                let listener = tokio::net::TcpListener::bind("127.0.0.1:4242")
                    .await
                    .expect("port 4242 déjà utilisé — vérifier qu'une seule instance tourne");
                axum::serve(listener, router).await.unwrap();
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Points d'attention identifiés :**

- **Port fixe obligatoire** (ex. `4242`) puisque les hooks Claude Code pointent
  dessus en dur dans `settings.json` — pas d'allocation dynamique possible ici.
  Documenter le port choisi, prévoir un message d'erreur clair si déjà pris
  (ex. deux instances de l'app lancées par erreur).
  - **Le hook JSON peut être remplacé par une liste d'IPs autorisées limitée à `127.0.0.1`.**
    Aucune exposition réseau externe : uniquement le localhost.
- **Debounce** : `PreToolUse`/`PostToolUse` se déclenchent à chaque appel d'outil,
  potentiellement plusieurs fois par seconde en session active. Un `Mutex<Instant>`
  côté Rust (ou côté frontend) pour éviter de spammer les transitions d'état.
- Un hook `http` échoue silencieusement (erreur non-bloquante côté Claude Code)
  si l'app Tauri n'est pas lancée — comportement safe par défaut, pas de crash
  côté CLI.

## Mapping events Claude Code → animations Strobi

| Event Claude Code                | Matcher   | Animation Strobi                                        | Notes                                                         |
| -------------------------------- | --------- | ------------------------------------------------------- | ------------------------------------------------------------- |
| `SessionStart`                   | `startup` | `waking` → `idle`                                       |                                                               |
| `UserPromptSubmit`               | —         | `thinking`                                              |                                                               |
| `PreToolUse`                     | `*`       | `working`                                               | affiner par `tool_name` (ex. `searching` pour Grep/WebSearch) |
| `PostToolUse`                    | `*`       | retour `idle` (avec debounce)                           |                                                               |
| `PostToolUseFailure`             | `*`       | `confused` ou `angry`                                   |                                                               |
| `Notification`                   | —         | `listening`                                             |                                                               |
| `SubagentStart` / `SubagentStop` | —         | `curious` / `excited`                                   | optionnel V2                                                  |
| `Stop`                           | —         | retour `idle`, puis `drowsy` → `sleeping` après timeout | timeout géré côté frontend                                    |
| `SessionEnd`                     | —         | `sleeping`                                              |                                                               |

Marge disponible pour affiner plus tard sans rien ajouter au moteur : `happy`,
`proud`, `celebrate`, `playful` (succès notables), `bored`/`drowsy` (inactivité
prolongée avant `sleeping`), `suspicious`/`scared` (permission sensible).

## Config des hooks (côté projet ou global)

```json
// ~/.claude/settings.json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "http", "url": "http://127.0.0.1:4242/event", "timeout": 5 }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          { "type": "http", "url": "http://127.0.0.1:4242/event", "timeout": 5 }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": [
          { "type": "http", "url": "http://127.0.0.1:4242/event", "timeout": 5 }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          { "type": "http", "url": "http://127.0.0.1:4242/event", "timeout": 5 }
        ]
      }
    ],
    "PostToolUseFailure": [
      {
        "matcher": "*",
        "hooks": [
          { "type": "http", "url": "http://127.0.0.1:4242/event", "timeout": 5 }
        ]
      }
    ],
    "Notification": [
      {
        "hooks": [
          { "type": "http", "url": "http://127.0.0.1:4242/event", "timeout": 5 }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "http", "url": "http://127.0.0.1:4242/event", "timeout": 5 }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          { "type": "http", "url": "http://127.0.0.1:4242/event", "timeout": 5 }
        ]
      }
    ]
  }
}
```

## Fallback si l'app n'est pas lancée (optionnel)

**Par défaut : ne rien faire.** C'est déjà le comportement natif d'un hook
`http` — si l'app n'est pas lancée, le POST échoue, Claude Code traite ça
comme une erreur non-bloquante, et il ne se passe rien de plus. Zéro code à
écrire, zéro script à maintenir. Vu l'objectif de minimalisme du projet,
c'est probablement le bon choix pour la V1 : le pet n'existe que quand l'app
tourne, point.

Le fallback ci-dessous n'est à envisager que si l'absence de notif devient
vraiment gênante à l'usage (ex. tu rates un `permission_prompt` important
parce que l'app était fermée) — à tester d'abord sans, avant d'ajouter cette
couche.

<details>
<summary>Fallback notification native Windows (si besoin plus tard)</summary>

Piège à éviter : ne pas dupliquer bêtement un hook `http` + un hook `command`
sur les mêmes events, sinon double notification quand l'app tourne (les hooks
d'un même matcher group se déclenchent tous, en parallèle, sans logique
conditionnelle entre eux).

Approche : un seul hook `command` qui essaie le HTTP d'abord, et ne notifie
nativement qu'en cas d'échec de connexion (app fermée = port 4242
injoignable). À réserver à l'event `Notification` uniquement — pas les events
à haute fréquence comme `PreToolUse`/`PostToolUse`, où un spawn de process à
chaque appel d'outil ajouterait de la latence pour un intérêt limité.

```json
// ~/.claude/settings.json — uniquement sur Notification
{
  "hooks": {
    "Notification": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "powershell.exe",
            "args": [
              "-NoProfile",
              "-ExecutionPolicy",
              "Bypass",
              "-File",
              "C:\\path\\to\\notify-fallback.ps1"
            ]
          }
        ]
      }
    ]
  }
}
```

```powershell
# notify-fallback.ps1 — relaie au pet si l'app tourne, sinon notif Windows native
$json = [Console]::In.ReadToEnd()

try {
    Invoke-RestMethod -Uri "http://127.0.0.1:4242/event" -Method Post `
        -Body $json -ContentType "application/json" -TimeoutSec 1 | Out-Null
} catch {
    # app pas lancée : notification native Windows (balloon tip, zéro dépendance)
    $payload = $json | ConvertFrom-Json
    $message = $payload.message
    if (-not $message) { $message = "Claude Code a besoin de ton attention" }

    Add-Type -AssemblyName System.Windows.Forms
    $notify = New-Object System.Windows.Forms.NotifyIcon
    $notify.Icon = [System.Drawing.SystemIcons]::Information
    $notify.Visible = $true
    $notify.ShowBalloonTip(3000, "Claude Code", $message, `
        [System.Windows.Forms.ToolTipIcon]::Info)
}
```

Le `NotifyIcon` balloon tip via `System.Windows.Forms` ne demande aucune
dépendance externe (contrairement à `BurntToast` qui nécessite d'installer un
module PowerShell).

À valider si implémenté : le nom exact du champ `message` dans le payload
JSON de l'event `Notification` (à confirmer en loggant un payload réel).

</details>

## Eye tracking souris (bonus)

Indépendant du système de hooks — purement côté app desktop. Piste à valider :
Tauri expose la position du curseur global via l'API window/monitor ; à vérifier
sur la version Tauri exacte utilisée (API en mouvement, ne pas se fier à une
version mémorisée). Alternative si l'API native est limitée : plugin communautaire
ou lecture de position via `enigo`/`device_query` côté Rust, relayée en event au
frontend au même titre que les hook events.

Le rendu SVG de `bloub` (yeux = 2 formes blanches indépendantes, moteur sans lib
d'animation) est un bon point de départ pour la logique de translation des
pupilles — à adapter en repositionnant les pupilles selon l'offset souris plutôt
qu'un blink/expression scripté.

## Stack proposée

- **Backend** : Tauri v2 (Rust) + `axum` + `tokio` (déjà inclus)
- **Frontend** : Vite + React + TypeScript
- **Assets** : SVG morphing (pas de spritesheet raster pour la V1)

### Comparatif final des repos évalués pour le moteur d'animation

| Critère                  | `bible-strong-avatar-lab` (Strobi)                                                                                                                                        | `bloub`                                                         | `blobatar`                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------- |
| Licence                  | **AGPL-3.0 confirmé** (fichier LICENSE lu intégralement)                                                                                                                  | MIT                                                             | Non confirmée                                      |
| Stack                    | **React natif, wrapper déjà écrit** (`Strobi.tsx`)                                                                                                                        | Vue 3 (wrapper à réécrire en React)                             | React natif                                        |
| Moteur                   | Vanilla JS pur, **0 dépendance** (vérifié par inspection du code : aucun `import`, pas de lib Motion/Framer — contrairement à ce que laissait penser le README du Studio) | Vanilla JS pur, 0 dépendance                                    | CSS pur (`motion.css`)                             |
| Animations dispo         | **23**, dont `sleeping`, `waking`, `idle`, `thinking`, `working` **nommées exactement ainsi**                                                                             | 14 états mesurés, sémantique "activité IA" mais mapping à faire | 10 expressions, dont `sleepy` proche de `sleeping` |
| Mapping vers états clawd | **Quasi 1:1, zéro traduction à faire**                                                                                                                                    | Bon fit conceptuel, mapping manuel                              | Fit partiel, mapping manuel                        |
| État machine interne     | Steps avec hold/transition/easing, blink auto, ambient motion (`slowDrift`/`shake`/`microSaccades`), `loop`/`once`/`pingPong`, pause/resume avec état préservé            | Comparable en sophistication                                    | Idle motion simple (breathe/bob/blink/glance)      |
| Travail d'intégration    | **Copier 4 fichiers, terminé**                                                                                                                                            | Copier `src/bot/` + écrire wrapper React                        | Copier composant, écrire mapping expressions→états |

### Décision : `bible-strong-avatar-lab` (Strobi) retenu

Revirement complet par rapport à l'évaluation initiale, après lecture du code source réel exporté (et non plus seulement du README du Studio) :

1. **Le moteur exporté n'a aucune dépendance à Motion/Framer** — l'objection initiale ("couplé à un runtime JS lourd") était fondée sur la description de l'outil d'édition, pas sur ce qui est réellement livré. Le fichier `avatar.js` inspecté est un module IIFE autonome, maths pures + `requestAnimationFrame`.
2. **Le wrapper React (`Strobi.tsx`) est déjà écrit**, robuste (gestion cleanup, ref impérative, typage strict) — zéro travail d'adaptation contrairement à `bloub`.
3. **23 animations nommées quasi 1:1 avec les états clawd voulus** (`sleeping`, `waking`, `idle`, `thinking`, `working` existent littéralement) — le meilleur fit sémantique des trois candidats, aucun mapping à inventer.

**Fichiers à copier tels quels** (dossier `src/avatar/`) :

- `strobi.avatar.ts` — données (expressions + animations)
- `avatar-runtime.ts` — loader du moteur (via Blob + `import()` dynamique)
- `Strobi.tsx` — composant React
- `strobi.index.ts` — exports publics

**Point technique à vérifier avant intégration** : le chargement se fait via `Blob` + `import()` dynamique. Dans une webview Tauri, la CSP par défaut peut bloquer les scripts `blob:` — à ajuster dans `tauri.conf.json` (`app.security.csp`) si besoin, ou remplacer le mécanisme Blob par un simple fichier statique importé au build (plus simple, évite la question CSP).

**Licence — implication concrète pour ce projet** : AGPL-3.0 confirmée par lecture du fichier LICENSE. Puisque le code est **copié** (pas consommé comme dépendance npm), l'app devient une œuvre dérivée soumise à l'AGPL dès qu'elle est distribuée à quelqu'un d'autre que toi :

- **Usage strictement perso, jamais partagé** → aucune obligation.
- **Publication/partage (pattern habituel sur tes autres projets)** → obligation de distribuer l'app entière sous AGPL avec le code source complet ("Corresponding Source"), pas de partie fermée possible.

Point encore ouvert : confirmer tes intentions de distribution pour ce projet avant de valider définitivement — si l'app est vouée à rester un outil perso, l'AGPL n'a aucun impact pratique.

`bloub` (MIT) reste l'alternative de secours si l'intégration du moteur Strobi pose un blocage technique imprévu, ou si la question de la distribution publique tranche en défaveur de l'AGPL.

### Packaging

Windows uniquement pour la V1 (`tauri.conf.json` → `bundle.targets: ["nsis"]`
ou `["msi"]`, pas de build cross-platform pour commencer).

## Backlog MVP (ordre suggéré)

1. Scaffold Tauri + serveur axum minimal, vérifier réception d'un event de test (`curl`)
2. Config hooks Claude Code → vérifier réception réelle des payloads en dev
3. 4 états statiques (idle/thinking/working/sleeping) en SVG, switch simple sans transition
4. Debounce + timeout d'inactivité → sleeping automatique
5. Transitions animées entre états (morphing façon bloub)
6. Eye tracking souris (bonus)
7. États supplémentaires (error, notification, juggling, sweeping)

## Décisions prises

- **Frontend** : Vite + React (tranché)
- **Moteur d'animation** : `bible-strong-avatar-lab` (composant Strobi),
  copié en 4 fichiers dans `src/avatar/` — licence **AGPL-3.0 confirmée**,
  impact réel uniquement si l'app est distribuée publiquement (à trancher)
- **Packaging** : Windows uniquement pour la V1
- **App fermée** : ne rien faire par défaut (comportement natif des hooks
  `http`) ; fallback notification native en option, à ajouter seulement si
  le besoin se confirme à l'usage

## Questions ouvertes

- **Distribution du projet** : reste-t-il un outil perso, ou suit-il le
  pattern de tes autres projets (publication publique) ? Détermine si
  l'AGPL-3.0 du moteur Strobi a un impact réel ou non.
- CSP Tauri à ajuster ou non pour le chargement `Blob`/`import()` dynamique
  du moteur (`avatar-runtime.ts`) — à tester en pratique dès le scaffold.
- Les 23 animations Strobi couvrent déjà large ; confirmer si `working` seul
  suffit ou si distinguer `working`/`searching` par `tool_name` apporte une
  vraie valeur perçue avant de complexifier le mapping.
