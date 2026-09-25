---
register: learnings
---

## Index

| ID                              | Date       | Pattern observé                                                                     | Tags                                                                                  |
| ------------------------------- | ---------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [LRN-001](learnings/LRN-001.md) | 2026-08-24 | Liseré blanc sur fenêtre undecorated = shadow natif Windows                         | #tauri #windows #shadow #undecorated-window #visual-bug                               |
| [LRN-002](learnings/LRN-002.md) | 2026-08-24 | Drag & drop cassé par permission Tauri v2 absente de `core:default`                 | #tauri #tauri2 #capabilities #permissions #drag-drop                                  |
| [LRN-003](learnings/LRN-003.md) | 2026-08-24 | pnpm `minimumReleaseAge` bloque `add` sur dep transitive sans rapport               | #pnpm #minimum-release-age #supply-chain #quarantine #cli-flag                        |
| [LRN-004](learnings/LRN-004.md) | 2026-08-24 | Avatar "disparaît" en dev = rebuild `tauri:dev` tue le backend                      | #tauri #tauri-dev #rebuild #cargo #hooky #debugging                                   |
| [LRN-005](learnings/LRN-005.md) | 2026-08-25 | Reset CSS global → `class` Tailwind sur `index.html`, spécificité                   | #tailwind #css #specificity #global-reset #index-html #arbitrary-value                |
| [LRN-006](learnings/LRN-006.md) | 2026-08-25 | Convention à portée large sans périmètre confirmé = sur-scope                       | #refactor-scope #css #over-engineering #convention #code-review                       |
| [LRN-007](learnings/LRN-007.md) | 2026-08-25 | Liste de priorité d'agrégation doit couvrir tout l'espace de sortie                 | #rust #state-machine #priority-list #exhaustiveness #silent-fallback                  |
| [LRN-008](learnings/LRN-008.md) | 2026-08-25 | Debug overlay doit tracer la session source, pas la dernière requête                | #rust #multi-session #debug-overlay #aggregate-state #ux                              |
| [LRN-009](learnings/LRN-009.md) | 2026-08-25 | Vérifier par fetch direct les affirmations chiffrées d'un agent                     | #research-agent #verification #hallucination #source-primaire                         |
| [LRN-010](learnings/LRN-010.md) | 2026-08-25 | Container query : réutiliser le contexte nommé du design system                     | #css #container-query #tailwind #design-system #responsive #consistency               |
| [LRN-011](learnings/LRN-011.md) | 2026-08-25 | `overflow-y:auto` implique `overflow-x:auto` — hit-target slider                    | #css #overflow #slider #scrollbar #accessibility #hit-target #base-ui                 |
| [LRN-012](learnings/LRN-012.md) | 2026-08-25 | Tauri `maxWidth` ignoré sans `maxHeight` pairé                                      | #tauri #webviewwindow #window-options #maxwidth #maxheight #api-quirk                 |
| [LRN-013](learnings/LRN-013.md) | 2026-08-25 | Export Studio peut violer le schéma de validation runtime                           | #avatar-react #json-schema #validation #error-boundary #studio-export #uncaught-error |
| [LRN-014](learnings/LRN-014.md) | 2026-08-25 | getBBox() sur SVG tiers capte des éléments invisibles                               | #svg #getbbox #dom-measurement #third-party #avatar-react                             |
| [LRN-015](learnings/LRN-015.md) | 2026-08-25 | Extension diagonale = distance euclidienne + rayon                                  | #geometry #euclidean-distance #bounding-box #math #2d                                 |
| [LRN-016](learnings/LRN-016.md) | 2026-08-25 | Windows anti-focus-stealing : show+unminimize+setFocus                              | #tauri #windows #focus-stealing #webviewwindow #setfocus                              |
| [LRN-017](learnings/LRN-017.md) | 2026-08-25 | Reaper doit reconstruire le payload via la même logique                             | #rust #axum #reaper #periodic-task #payload-consistency #desync                       |
| [LRN-018](learnings/LRN-018.md) | 2026-08-25 | fetch() webview→backend local reste soumis au CORS                                  | #tauri #cors #webview #fetch #cross-origin                                            |
| [LRN-019](learnings/LRN-019.md) | 2026-08-25 | Composant SVG dans un `<div>` wrapper ignore la classe de taille                    | #react #svg #icon-component #css #sizing #tailwind                                    |
| [LRN-020](learnings/LRN-020.md) | 2026-08-25 | Transition CSS d'entrée sur nœud fraîchement monté = double rAF                     | #react #css #css-transition #requestanimationframe #mount #entrance-animation         |
| [LRN-021](learnings/LRN-021.md) | 2026-08-25 | lucide-animated est un registre copier-coller, pas un package npm                   | #lucide-animated #motion #icon-library #shadcn-registry #external-lib                 |
| [LRN-022](learnings/LRN-022.md) | 2026-08-25 | Un timer de transition en vol doit être gardé, pas redémarré                        | #react #debounce #race-condition #timer #transition #settimeout                       |
| [LRN-023](learnings/LRN-023.md) | 2026-08-25 | Claude Code hooks : session_id partagé parent/sous-agents, agent_id distingue       | #claude-code #hooks #session-id #agent-id #subagent #fork                             |
| [LRN-024](learnings/LRN-024.md) | 2026-08-25 | Bug non-déterministe : contrôle du process + payloads synthétiques > théorie        | #debugging #methodology #reproduction #isolation #root-cause                          |
| [LRN-025](learnings/LRN-025.md) | 2026-08-25 | ListAgents/SendMessage pour interroger une session pair plutôt que deviner          | #claude-code #cross-session #listagents #sendmessage #debugging                       |
| [LRN-026](learnings/LRN-026.md) | 2026-08-26 | Tailwind v4 : `scale`/`rotate` sont des propriétés CSS natives, pas `transform`     | #tailwind #tailwindv4 #css-transition #scale #rotate #breaking-change                 |
| [LRN-027](learnings/LRN-027.md) | 2026-08-26 | Calculer la durée réelle du cycle d'animation plutôt qu'un timeout arbitraire       | #avatar #animation #react #settimeout #cycle-duration #desync #preview                |
| [LRN-028](learnings/LRN-028.md) | 2026-08-26 | Densité visuelle, pas volume, décide d'un onglet dédié                              | #ux #tabs #settings #design-system #visual-density #ui-pattern                        |
| [LRN-029](learnings/LRN-029.md) | 2026-08-26 | Spread avec clé explicitement `undefined` écrase une valeur du côté cible           | #javascript #typescript #object-spread #undefined #partial-override #bug-pattern      |
| [LRN-030](learnings/LRN-030.md) | 2026-08-26 | Rebuild coûteux dans un hook doit se mémoïser sur des primitives                    | #react #usememo #performance #ipc #tauri #object-identity                             |
| [LRN-031](learnings/LRN-031.md) | 2026-08-26 | `input type=color` : onChange React = event natif "input" continu                   | #react #color-input #onchange #native-events #debounce #performance                   |
| [LRN-032](learnings/LRN-032.md) | 2026-08-26 | Étendre le mécanisme de transition existant plutôt qu'un parallèle                  | #react #transition #simplification #over-engineering #remount #key-prop               |
| [LRN-033](learnings/LRN-033.md) | 2026-08-26 | Découpler AlertDialog de son Trigger pour piloter 2 boutons responsive              | #react #alert-dialog #base-ui #controlled-component #responsive #dialog               |
| [LRN-034](learnings/LRN-034.md) | 2026-08-26 | `run_in_background:true` + `&` en fin de commande = process zombie                  | #bash-tool #run-in-background #zombie-process #tooling #port-conflict                 |
| [LRN-035](learnings/LRN-035.md) | 2026-08-26 | Vérifier une fenêtre Tauri native via interop Win32 direct sans harness e2e         | #tauri #desktop-testing #win32 #powershell #screenshot #e2e-fallback                  |
| [LRN-036](learnings/LRN-036.md) | 2026-08-28 | GDI screenshot ne capture pas fiablement les fenêtres transparentes WebView2        | #tauri #webview2 #screenshot #gdi #powershell #directcomposition #debugging           |
| [LRN-037](learnings/LRN-037.md) | 2026-08-28 | Tauri `monitorFromPoint` vs `currentMonitor`                                        | #tauri #tauri2 #webviewwindow #monitor #multi-window #api-quirk                       |
| [LRN-038](learnings/LRN-038.md) | 2026-08-28 | `Edit` refuse d'écrire à travers un symlink                                         | #settings-json #symlink #edit-tool #dotfiles #windows #powershell                     |
| [LRN-039](learnings/LRN-039.md) | 2026-08-28 | Contenu collé au bord plutôt que centré dans un conteneur surdimensionné            | #css #flexbox #layout #ui-technique #oversized-container                              |
| [LRN-040](learnings/LRN-040.md) | 2026-08-29 | Récidive désync reaper (LRN-017) : fix partiel + rituel mémoire pas re-déclenché    | #rust #axum #reaper #desync #dedup #memory-ritual #meta                               |
| [LRN-041](learnings/LRN-041.md) | 2026-08-29 | `pointer-events:none` hérité désactive réellement les descendants SVG               | #css #pointer-events #svg #inheritance #hit-testing #drag-drop                        |
| [LRN-042](learnings/LRN-042.md) | 2026-08-29 | React StrictMode + effet async (listen()) = fenêtre de course, 2 abonnements        | #react #strictmode #async #race-condition #event-listener #tauri                      |
| [LRN-043](learnings/LRN-043.md) | 2026-08-29 | Tauri `setIgnoreCursorEvents` non fiable sur Windows/WebView2                       | #tauri #tauri2 #windows #webview2 #click-through #setignorecursorevents #known-bug    |
| [LRN-044](learnings/LRN-044.md) | 2026-08-29 | Champs Claude Code hooks `stop_hook_active`/`prompt_id` utiles pour un doublon      | #claude-code #hooks #stop-hook-active #prompt-id #debugging #duplicate-events         |
| [LRN-045](learnings/LRN-045.md) | 2026-08-29 | Restreindre un mousedown délégué via data-attribute + closest(), pas pointer-events | #dom #event-delegation #data-attribute #hit-test #mousedown #drag-drop                |
| [LRN-046](learnings/LRN-046.md) | 2026-08-29 | Auditer tous les pointer-events-auto avant de scoper un hit-test à un conteneur     | #react #sibling-tree #pointer-events #hit-test #code-review #overlay                  |
| [LRN-047](learnings/LRN-047.md) | 2026-08-29 | Élément décoratif absolu dans un parent transform se peint par-dessus son fond      | #css #z-index #stacking-context #transform #absolute-positioning #speech-bubble       |
| [LRN-048](learnings/LRN-048.md) | 2026-08-29 | Bande de couleur verticale en bord de carte = signal "AI slop"                      | #ui-design #accent-color #ai-slop #design-taste #frontend-design                      |
| [LRN-049](learnings/LRN-049.md) | 2026-08-29 | Timer d'auto-masquage d'un effet streaming/typewriter doit partir de la fin         | #ui #timer #typewriter-effect #streaming #hover #ux #race-condition                   |
| [LRN-050](learnings/LRN-050.md) | 2026-08-29 | `position: relative` en masse écrase les `absolute` déjà posés                      | #css #position #css-cascade #attribute-selector #override #debugging                  |
| [LRN-051](learnings/LRN-051.md) | 2026-08-29 | Composant partagé lisant une state globale la fuit dans tous ses usages             | #react #props-vs-global-state #component-reuse #state-leakage #code-review            |
| [LRN-052](learnings/LRN-052.md) | 2026-08-29 | Tailwind ne génère que des classes littérales, jamais interpolées                   | #tailwind #dynamic-classes #jit #purge #css-generation                                |
| [LRN-053](learnings/LRN-053.md) | 2026-08-29 | `startDragging()` (Tauri) résout sa promesse au lancement, pas à la fin             | #tauri #startdragging #window-drag #promise-timing                                    |
| [LRN-054](learnings/LRN-054.md) | 2026-08-29 | Motion `layout` course indéfiniment une dépendance qui change en continu            | #motion #framer-motion #layout-prop #animation #react                                 |
| [LRN-055](learnings/LRN-055.md) | 2026-08-29 | Un clamp de drag doit border le bord réel du contenu, pas la boîte englobante       | #drag-drop #clamp #ui #cursor-sync #css                                               |
| [LRN-056](learnings/LRN-056.md) | 2026-08-29 | État dérivé pilotant rendu+clamp externe : geler pendant l'interaction              | #react #derived-state #drag #freeze-pattern #race-condition                           |
| [LRN-057](learnings/LRN-057.md) | 2026-08-30 | CSS synchrone vs repositionnement fenêtre OS asynchrone = flash structurel          | #tauri #ipc #window-position #css #race-condition #flash                              |
| [LRN-058](learnings/LRN-058.md) | 2026-08-30 | `translateY(-100%)` sur ancrage `top` unique = bascule sans mesurer de hauteur      | #css #transform #translatey #transition #layout-technique                             |
| [LRN-059](learnings/LRN-059.md) | 2026-08-30 | Ref miroir de state : mise à jour synchrone au call site, pas via `useEffect`       | #react #ref #use-effect #race-condition #state-sync                                   |
| [LRN-060](learnings/LRN-060.md) | 2026-08-30 | Tester Hooky depuis la session Claude Code qui le teste pollue le test              | #hooky #dogfooding #react-batching #testing-methodology #self-referential #tauri      |
| [LRN-061](learnings/LRN-061.md) | 2026-08-30 | `GetWindowRgn` est déclarée dans `user32.dll`, pas `gdi32.dll`                      | #windows #win32 #pinvoke #gdi32 #user32 #api-quirk                                    |
| [LRN-062](learnings/LRN-062.md) | 2026-08-30 | `PtInRegion` vérifie la forme réelle d'une région sans capture d'écran              | #windows #win32 #setwindowrgn #ptinregion #debugging #verification                    |
| [LRN-063](learnings/LRN-063.md) | 2026-08-30 | `Tauri::Window::hwnd()` doit être réenveloppé pour la crate `windows`               | #tauri #windows-rs #hwnd #rust #ffi #interop                                          |
| [LRN-064](learnings/LRN-064.md) | 2026-08-30 | Fenêtre Tauri spawnée en réaction à un event n'en reçoit jamais le rejeu            | #tauri #webviewwindow #event #race-condition #spawn #pub-sub                          |
| [LRN-065](learnings/LRN-065.md) | 2026-08-30 | Redimensionner une fenêtre AVANT `show()` élimine le flash de resize                | #tauri #webviewwindow #window-resize #flash-free #dynamic-sizing #popup               |
| [LRN-066](learnings/LRN-066.md) | 2026-08-30 | Porter un mécanisme de compensation visuelle en entier lors d'une ré-architecture   | #refactor #architecture-migration #regression #compensation-mechanism #edge-case      |
| [LRN-067](learnings/LRN-067.md) | 2026-08-31 | `getBoundingClientRect()` inclut les transforms CSS, `offsetHeight` non             | #css #dom-measurement #getboundingclientrect #offsetheight #css-transform             |
| [LRN-068](learnings/LRN-068.md) | 2026-08-31 | Mesurer du texte avant `document.fonts.ready` mesure sur la police de repli         | #css #web-fonts #font-loading #dom-measurement #race-condition #fouc                  |
| [LRN-069](learnings/LRN-069.md) | 2026-08-31 | Fenêtre Tauri sizée pile au contenu rogne tout effet CSS qui déborde de la boîte    | #tauri #css #box-shadow #drop-shadow #window-resize #clipping                         |
| [LRN-070](learnings/LRN-070.md) | 2026-08-31 | Gap "côté opposé à un repère" peut ne fonctionner que dans une seule orientation    | #css #box-shadow #tailwind #orientation #flip #debugging                              |
| [LRN-071](learnings/LRN-071.md) | 2026-08-31 | État CSS live ne doit jamais dépasser une opération OS débouncée qui le borne       | #react #css #debounce #window-resize #race-condition #ux                              |
| [LRN-072](learnings/LRN-072.md) | 2026-09-04 | `SetForegroundWindow` échoue depuis un process externe, `SetWindowPos(TOPMOST)` OK  | #windows #win32 #setforegroundwindow #focus-stealing #setwindowpos #screenshot        |
| [LRN-073](learnings/LRN-073.md) | 2026-09-04 | `@tailwindcss/vite` scanne tout le repo, exclure la doc du watch                    | #tailwind #tailwindv4 #vite #watch #hmr #full-reload #docs                            |
| [LRN-074](learnings/LRN-074.md) | 2026-09-05 | Merge JSON idempotent par identité stable, jamais par égalité de texte exacte       | #rust #json-merge #idempotency #hooks-install #session-start #regression              |
| [LRN-078](learnings/LRN-078.md) | 2026-09-10 | Champ API non vérifiable : parier défensivement, jamais crasher                     | #api-integration #defensive-coding #unverified-schema #fallback                       |
| [LRN-079](learnings/LRN-079.md) | 2026-09-10 | Icône animée en boucle infinie ≠ glyphe statique ponctuel                           | #react #icon-reuse #animation #component-context #lucide-react                        |
| [LRN-080](learnings/LRN-080.md) | 2026-09-11 | `cargo metadata --no-deps` ne réécrit pas la version propre dans Cargo.lock         | #rust #cargo #cargo-lock #version-sync #automation                                    |
| [LRN-081](learnings/LRN-081.md) | 2026-09-11 | Relancer une app desktop complète pour tester perturbe l'écran de l'utilisateur     | #desktop-app #testing-methodology #headless #gui #tauri                               |
| [LRN-082](learnings/LRN-082.md) | 2026-09-11 | Regarder les projets équivalents avant de dégrader l'UX pour un rate-limit          | #research-methodology #rate-limit #oss-reference #problem-solving                     |
| [LRN-083](learnings/LRN-083.md) | 2026-09-11 | `claude auth status` ne rafraîchit pas le token OAuth                               | #claude-code #oauth #auth-status #cli #refresh-token #empirical-testing               |
| [LRN-084](learnings/LRN-084.md) | 2026-09-11 | Un 429 observé sur un endpoint peut couvrir tout un service, pas que lui            | #rate-limit #429 #debugging #api #scope-of-failure                                    |
| [LRN-085](learnings/LRN-085.md) | 2026-09-11 | Tester un appel réseau sensible hors code prod, avec backup/restore                 | #credentials #security #testing-methodology #backup-restore #sensitive-file           |
| [LRN-086](learnings/LRN-086.md) | 2026-09-12 | Valider un fix asynchrone via corrélation d'horodatages, sans observation directe   | #debugging-methodology #timestamp-correlation #async-fix-validation #log-analysis     |
| [LRN-087](learnings/LRN-087.md) | 2026-09-12 | Mesurer un écart de marge fenêtre via GetWindowRect + Screen.Bounds/WorkingArea     | #win32 #getwindowrect #debugging #screen-measurement #taskbar #verification           |
| [LRN-088](learnings/LRN-088.md) | 2026-09-23 | Format d'asset communautaire non documenté : mesurer les fichiers réels | #reverse-engineering #webp #spritesheet #verification #community-assets #codex-pets |
| [LRN-089](learnings/LRN-089.md) | 2026-09-24 | Clé Uninstall NSIS Tauri : InstallLocation entre guillemets | #tauri #nsis #registry #powershell #windows #install-location |
| [LRN-090](learnings/LRN-090.md) | 2026-09-24 | Config partagée : résoudre les chemins à l'exécution | #config #multi-machine #paths #registry #settings-json #portability |
| [LRN-091](learnings/LRN-091.md) | 2026-09-24 | Frames par ligne variables selon le pet : les compter | #codex-pets #spritesheet #frames #measurement #hardcoded-constant |
| [LRN-092](learnings/LRN-092.md) | 2026-09-24 | Couleur dominante : regrouper par plage de teinte | #color #dominant-color #hue #canvas #sprite #wcag #quantization |
| [LRN-093](learnings/LRN-093.md) | 2026-09-24 | Valider une spritesheet : planche de contact numérotée | #spritesheet #pillow #contact-sheet #verification #web-search #codex-pets |
| [LRN-094](learnings/LRN-094.md) | 2026-09-24 | Doc web illisible : lire le tarball npm de la CLI | #npm #npm-pack #cli #documentation #minified-js #petdex |
| [LRN-095](learnings/LRN-095.md) | 2026-09-24 | Tauri asset: scope allow_file à l'exécution et CORS | #tauri #tauri2 #asset-protocol #scope #cors #windows #security |
| [LRN-096](learnings/LRN-096.md) | 2026-09-24 | Tester du front sans navigateur : esbuild + stubs DOM | #testing #esbuild #node #canvas #pnpm #harness #pillow |
| [LRN-097](learnings/LRN-097.md) | 2026-09-24 | Tester du canvas : page servie en HTTP local, même origine | #canvas #testing #localhost #http-server #webp #claude-browser #codex-pets |
| [LRN-098](learnings/LRN-098.md) | 2026-09-24 | Un effet sur l'état par défaut devient permanent | #ux #default-state #opacity #ambient-ui #feedback #codex-pets |
| [LRN-099](learnings/LRN-099.md) | 2026-09-24 | Un comportement ambiant se branche sur l'état « sans signal » | #ux #ambient-ui #default-state #event-driven #codex-pets #priority |
| [LRN-100](learnings/LRN-100.md) | 2026-09-24 | Suivre le curseur hors fenêtre Tauri : polling de cursorPosition | #tauri #tauri2 #cursor-position #polling #windows #capabilities #dpi |
| [LRN-101](learnings/LRN-101.md) | 2026-09-24 | Orb WebGPU paused avant 1re frame : invisible en sleeping | #webgpu #orb #paused #default-state #first-frame #codex-pets |
| [LRN-102](learnings/LRN-102.md) | 2026-09-24 | Shaders TypeGPU : unplugin-typegpu avec enforce: pre | #typegpu #unplugin-typegpu #vite #esbuild #enforce-pre #shadercn |
| [LRN-103](learnings/LRN-103.md) | 2026-09-24 | Licence d'un composant copié : lire l'en-tête des fichiers | #licence #open-source #vendoring #shadcn #shadercn #due-diligence #agpl |
| [LRN-104](learnings/LRN-104.md) | 2026-09-24 | Déboguer Tauri/WebView2 : remote-debugging-port + CDP | #tauri #webview2 #cdp #remote-debugging #testing #windows #webgpu |
| [LRN-105](learnings/LRN-105.md) | 2026-09-24 | shadcn add tiers : registryDependencies non namespacé échoue | #shadcn #registry #registryDependencies #cli #workaround #shadercn |
| [LRN-106](learnings/LRN-106.md) | 2026-09-25 | Un git reset d'une autre session efface mon staging | #git #parallel-sessions #reset #reflog #staging #list-sessions #commit-hygiene |
| [LRN-107](learnings/LRN-107.md) | 2026-09-25 | Retrait manuel : prouver l'équivalence par git diff --stat | #git #cleanup #diff #verification #formatter-hook #revert |
| [LRN-108](learnings/LRN-108.md) | 2026-09-25 | vite.config.js versionné, réécrit à chaque pnpm build | #vite #tsc #composite #generated-file #build #diff-noise #tauri |
| [LRN-109](learnings/LRN-109.md) | 2026-09-25 | Habillage NSIS : BMP 24 bits sans alpha, tailles imposées | #tauri #nsis #bmp #installer #assets #system-drawing |
| [LRN-110](learnings/LRN-110.md) | 2026-09-25 | Langue NSIS mémorisée par publisher : la clé se déplace | #nsis #registry #installer-language #publisher #tauri #windows |
| [LRN-111](learnings/LRN-111.md) | 2026-09-25 | Installateur GUI : lancer, capturer l'écran, tuer | #nsis #testing #screenshot #makensis #installer #debugging |
| [LRN-112](learnings/LRN-112.md) | 2026-09-25 | Un état « travail » sans timeout colle si l'outil attend | #hooks #working #timeout #askuserquestion #state-machine #ambience |
| [LRN-113](learnings/LRN-113.md) | 2026-09-25 | Rallumer un réglage en cours d'état : suivre l'état d'avance | #settings #side-effects #react-hooks #state #loop #ux |
| [LRN-114](learnings/LRN-114.md) | 2026-09-25 | Pack de sons : mesurer le volume, égaliser par pack | #audio #loudness #normalization #rms #python #soundfile #assets |
| [LRN-115](learnings/LRN-115.md) | 2026-09-25 | Boucle audio sans trou : OGG + AudioBufferSourceNode | #web-audio #loop #gapless #ogg #mp3 #audiobuffersource #fade |
| [LRN-116](learnings/LRN-116.md) | 2026-09-25 | Tauri multi-fenêtres : un AudioContext par webview | #tauri #multi-window #web-audio #localstorage #duplicate #preview |
| [LRN-117](learnings/LRN-117.md) | 2026-09-25 | Tester un moteur audio : Vite SSR + faux AudioContext | #testing #web-audio #vite #ssr #mock #harness #import-meta-glob |
| [LRN-118](learnings/LRN-118.md) | 2026-09-25 | shadcn add : import `cn` cassé + dépendance npm parasite | #shadcn #cli #cn #select #accordion #registry #workaround |
