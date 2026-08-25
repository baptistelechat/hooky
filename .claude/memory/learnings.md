---
register: learnings
---

## Index

| ID                              | Date       | Pattern observé                                                               | Tags                                                                                  |
| ------------------------------- | ---------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [LRN-001](learnings/LRN-001.md) | 2026-08-24 | Liseré blanc sur fenêtre undecorated = shadow natif Windows                   | #tauri #windows #shadow #undecorated-window #visual-bug                               |
| [LRN-002](learnings/LRN-002.md) | 2026-08-24 | Drag & drop cassé par permission Tauri v2 absente de `core:default`           | #tauri #tauri2 #capabilities #permissions #drag-drop                                  |
| [LRN-003](learnings/LRN-003.md) | 2026-08-24 | pnpm `minimumReleaseAge` bloque `add` sur dep transitive sans rapport         | #pnpm #minimum-release-age #supply-chain #quarantine #cli-flag                        |
| [LRN-004](learnings/LRN-004.md) | 2026-08-24 | Avatar "disparaît" en dev = rebuild `tauri:dev` tue le backend                | #tauri #tauri-dev #rebuild #cargo #hooky #debugging                                   |
| [LRN-005](learnings/LRN-005.md) | 2026-08-25 | Reset CSS global → `class` Tailwind sur `index.html`, spécificité             | #tailwind #css #specificity #global-reset #index-html #arbitrary-value                |
| [LRN-006](learnings/LRN-006.md) | 2026-08-25 | Convention à portée large sans périmètre confirmé = sur-scope                 | #refactor-scope #css #over-engineering #convention #code-review                       |
| [LRN-007](learnings/LRN-007.md) | 2026-08-25 | Liste de priorité d'agrégation doit couvrir tout l'espace de sortie           | #rust #state-machine #priority-list #exhaustiveness #silent-fallback                  |
| [LRN-008](learnings/LRN-008.md) | 2026-08-25 | Debug overlay doit tracer la session source, pas la dernière requête          | #rust #multi-session #debug-overlay #aggregate-state #ux                              |
| [LRN-009](learnings/LRN-009.md) | 2026-08-25 | Vérifier par fetch direct les affirmations chiffrées d'un agent               | #research-agent #verification #hallucination #source-primaire                         |
| [LRN-010](learnings/LRN-010.md) | 2026-08-25 | Container query : réutiliser le contexte nommé du design system               | #css #container-query #tailwind #design-system #responsive #consistency               |
| [LRN-011](learnings/LRN-011.md) | 2026-08-25 | `overflow-y:auto` implique `overflow-x:auto` — hit-target slider              | #css #overflow #slider #scrollbar #accessibility #hit-target #base-ui                 |
| [LRN-012](learnings/LRN-012.md) | 2026-08-25 | Tauri `maxWidth` ignoré sans `maxHeight` pairé                                | #tauri #webviewwindow #window-options #maxwidth #maxheight #api-quirk                 |
| [LRN-013](learnings/LRN-013.md) | 2026-08-25 | Export Studio peut violer le schéma de validation runtime                     | #avatar-react #json-schema #validation #error-boundary #studio-export #uncaught-error |
| [LRN-014](learnings/LRN-014.md) | 2026-08-25 | getBBox() sur SVG tiers capte des éléments invisibles                         | #svg #getbbox #dom-measurement #third-party #avatar-react                             |
| [LRN-015](learnings/LRN-015.md) | 2026-08-25 | Extension diagonale = distance euclidienne + rayon                            | #geometry #euclidean-distance #bounding-box #math #2d                                 |
| [LRN-016](learnings/LRN-016.md) | 2026-08-25 | Windows anti-focus-stealing : show+unminimize+setFocus                        | #tauri #windows #focus-stealing #webviewwindow #setfocus                              |
| [LRN-017](learnings/LRN-017.md) | 2026-08-25 | Reaper doit reconstruire le payload via la même logique                       | #rust #axum #reaper #periodic-task #payload-consistency #desync                       |
| [LRN-018](learnings/LRN-018.md) | 2026-08-25 | fetch() webview→backend local reste soumis au CORS                            | #tauri #cors #webview #fetch #cross-origin                                            |
| [LRN-019](learnings/LRN-019.md) | 2026-08-25 | Composant SVG dans un `<div>` wrapper ignore la classe de taille              | #react #svg #icon-component #css #sizing #tailwind                                    |
| [LRN-020](learnings/LRN-020.md) | 2026-08-25 | Transition CSS d'entrée sur nœud fraîchement monté = double rAF               | #react #css #css-transition #requestanimationframe #mount #entrance-animation         |
| [LRN-021](learnings/LRN-021.md) | 2026-08-25 | lucide-animated est un registre copier-coller, pas un package npm             | #lucide-animated #motion #icon-library #shadcn-registry #external-lib                 |
| [LRN-022](learnings/LRN-022.md) | 2026-08-25 | Un timer de transition en vol doit être gardé, pas redémarré                  | #react #debounce #race-condition #timer #transition #settimeout                       |
| [LRN-023](learnings/LRN-023.md) | 2026-08-25 | Claude Code hooks : session_id partagé parent/sous-agents, agent_id distingue | #claude-code #hooks #session-id #agent-id #subagent #fork                             |
| [LRN-024](learnings/LRN-024.md) | 2026-08-25 | Bug non-déterministe : contrôle du process + payloads synthétiques > théorie  | #debugging #methodology #reproduction #isolation #root-cause                          |
| [LRN-025](learnings/LRN-025.md) | 2026-08-25 | ListAgents/SendMessage pour interroger une session pair plutôt que deviner    | #claude-code #cross-session #listagents #sendmessage #debugging                       |
