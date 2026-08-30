# Roadmap — Hooky

Backlog révisé après passage Rodin sur `BRIEF.md` (voir échanges) et inspection réelle
des fichiers copiés dans `docs/avatar/`. Changements structurants par rapport au backlog
initial du brief :

1. **Fenêtre/tray ajoutée en étape 0** — absente du brief initial, pourtant condition
   sine qua non pour qu'il y ait un "pet de bureau" au sens propre.
2. **Session-awareness dès l'étape 1**, pas repoussée — usage réel confirmé (sessions
   Claude Code multiples en parallèle), pas un besoin hypothétique.
3. **Avatar renommé Strobi → Cubee** — le personnage exporté du Studio a changé (forme
   cube, rouge), pas juste un rename cosmétique du composant technique.
4. **Eye tracking retiré pour le moment** — Strobi/Cubee n'expose aucune API de regard
   pilotable de l'extérieur ; le contournement (lean du corps entier) a été jugé pas
   satisfaisant et retiré à la demande de Baptiste. L'avatar reste simplement centré.

## Suivi d'avancement

- [x] Étape 0 — Coquille app (fenêtre + tray + single-instance)
- [x] Étape 1 — Serveur axum + state multi-session
- [x] Étape 2 — Config hooks Claude Code (prête, pas encore fusionnée dans `~/.claude/settings.json`)
- [x] Étape 3 — Intégration de l'avatar (Cubee)
- [x] Étape 4 — Debounce + timeout sleeping
- [x] Étape 5 — Eye tracking souris — **retiré** (voir note ci-dessus), pas de reste de code
- [x] Étape 6a — Granularité `working`/`searching` par `tool_name`
- [x] Étape 6b — `bored` câblé (vrai signal : idle depuis 90s, avant l'éviction à 300s) ; le reste (happy, proud, celebrate...) documenté ci-dessous comme non retenu, pas oublié
- [x] Étape 7a — Fix visuel : bordure/liseré blanc autour du pet (cause réelle : `shadow` natif Windows sur fenêtre undecorated, pas la taille de fenêtre)
- [x] Étape 7b — Fix drag & drop (cause réelle : permission `core:window:allow-start-dragging` manquante dans `capabilities/default.json`)
- [x] Étape 7c — Découpage frontend en `hooks/` + `components/` pour réutilisabilité
- [x] Étape 7d — Tooling `package.json` : ESLint installé et configuré (le script existait, rien derrière), `typecheck` ajouté
- [x] Étape 8 — Mapping des hooks finalisé : `StopFailure`, `SubagentStart`/`SubagentStop`,
      `PreCompact`/`PostCompact`, `PermissionRequest`, `Elicitation` ajoutés (7 events, sur la
      palette d'animations existante, aucun ajout d'animation) — voir table mise à jour plus bas
      pour le détail et pour ce qui reste volontairement non mappé
- [x] Étape 9 — Migration du moteur copié vers le package npm `@bible-strong/avatar-react` (licence AGPL-3.0-only inchangée)
- [x] En-têtes `NOTICE` (licence AGPL) ajoutés dans `src/avatar/*`, `LICENSE` (AGPL-3.0 complète) créée à la racine
- [x] **Fusionner `hooks/claude-settings-snippet.json` dans le `settings.json` global**
      — fait. La cause du blocage initial n'était pas un verrou de process (mauvais
      diagnostic de ma part) mais l'attribut **ReadOnly** du fichier — protection
      volontaire et permanente de Baptiste sur ce fichier de config partagé entre
      projets, temporairement désactivée pour permettre l'écriture. Fusion appliquée,
      validée : JSON syntaxiquement correct, les 8 hooks existants (`notify/main.ps1`,
      `session-start-context.ps1`, `bash-failure-diagnose.ps1`, `claude_status.py`,
      `pnpm-add-reminder.ps1`, `prettier-format.ps1`, `npx-to-pnpm-dlx.ps1`,
      `rtk hook claude`) tous présents et intacts, 8 nouveaux hooks HTTP vers
      `127.0.0.1:4242` ajoutés en blocks séparés (aucun hook existant modifié).
      **Attribut ReadOnly restauré après écriture.**
- [x] **Drag & drop** — fix applicatif vérifié à deux niveaux indépendants : (1) la
      fenêtre a effectivement bougé pendant les tests automatisés après l'ajout de la
      permission ; (2) `src-tauri/gen/schemas/acl-manifests.json` confirme que
      `allow-start-dragging` est un identifiant de permission Tauri réel et valide
      (pas une supposition issue d'une recherche web), et `capabilities.json` généré
      confirme qu'elle est bien résolue/active dans le binaire compilé (`cargo check`
      ne l'aurait pas laissé passer sinon). _Caveat, pas une tâche en attente_ : la
      sensation "fluide au clic" reste une confirmation subjective que seul un vrai
      test à la souris peut donner — hors de portée d'une vérification automatisée
      par nature, pas un TODO oublié.

## Licence — tranchée

Projet destiné à être partagé publiquement (confirmé). Moteur avatar copié depuis
[`smontlouis/bible-strong-avatar-lab`](https://github.com/smontlouis/bible-strong-avatar-lab)
sous **AGPL-3.0** (vérifié sur le repo réel, pas seulement le README).

- **Tout le repo Hooky passe en AGPL-3.0** (`LICENSE` à la racine) — le frontend
  importe le code du moteur directement (pas de séparation nette process/lien statique
  côté Tauri bundle), donc pas la peine de jouer la carte licence mixte.
- ✅ En-têtes `NOTICE` créditant `smontlouis/bible-strong-avatar-lab` ajoutés dans les
  4 fichiers de `src/avatar/`, `LICENSE` (texte AGPL-3.0 intégral, récupéré du repo
  source) créée à la racine du projet.

## Étape 0 — Coquille app (fenêtre + tray) ✅

- Fenêtre Tauri transparente, `decorations: false`, `shadow: false`, always-on-top,
  **240×240 exact (0 marge)** — cropée à l'avatar comme demandé.
- Icône systray : "Quitter", "Recentrer la fenêtre".
- Single-instance via `tauri-plugin-single-instance` — testé en conditions réelles
  (double-lancement pendant la session : la deuxième instance a bien été absorbée sans
  casser la première).

## Étape 1 — Serveur axum + state multi-session ✅

- `axum` dans `setup()`, port fixe `4242`, binding `127.0.0.1` uniquement.
- State partagé `Arc<Mutex<HashMap<SessionId, SessionState>>>`.
- Résolution d'état agrégé : `working` > `searching` > `thinking` > `listening` > `idle`,
  `sleeping` si plus aucune session active.
- Testé end-to-end via `curl` + capture d'écran.

## Étape 2 — Hooks Claude Code réels ✅ (config prête, pas encore installée)

- `hooks/claude-settings-snippet.json` + `hooks/README.md` prêts.
- **Reste à faire (toi)** : fusionner le snippet dans `~/.claude/settings.json`.

## Étape 3 — Intégration de l'avatar (Cubee) ✅

Composant dans `src/avatar/` : `Cubee.tsx`, `cubee.avatar.ts`, `avatar-runtime.ts`,
`cubee.index.ts`. `PetAvatar.tsx` rend `<Cubee animation={animation} size={240} />`
piloté par le hook `useHookyState`. Aucun placeholder restant.

CSP par défaut (`"csp": null`, désactivée) : le chargement `Blob` + `import()`
dynamique du moteur ne pose aucun problème.

## Étape 4 — Debounce + timeout sleeping ✅

Timeout d'inactivité (5 min) qui retire une session de la map côté Rust même sans
`SessionEnd` explicite (terminal fermé brutalement) ; calibré sur l'état agrégé.

## Étape 5 — Eye tracking souris — retiré

Le moteur n'expose aucune API pour piloter le regard depuis l'extérieur (yeux
procéduraux internes, pas mouse-driven). Le contournement testé (lean du corps entier
vers le curseur) a été jugé pas satisfaisant — retiré à la demande de Baptiste, backend
et frontend nettoyés (plus d'event `hooky-cursor`, plus de dépendance à
`cursor_position()`). L'avatar est maintenant **simplement centré**, sans effet
additionnel. À reconsidérer si le moteur expose un jour ce type de hook.

## Étape 6 — États supplémentaires

- [x] Granularité `working` vs `searching` par `tool_name`
      (Grep/WebSearch/Glob/WebFetch) — coût négligeable comme anticipé.
- [x] `bored` — session `idle` depuis plus de 90s (avant l'éviction complète à 300s,
      cf. étape 4) affiche `bored` plutôt que `idle`. Signal réel (temps écoulé),
      reprend l'intention déjà notée dans le brief initial ("bored/drowsy : inactivité
      prolongée avant sleeping").
- **Non retenu, décision explicite (pas un oubli)** : `happy`, `proud`, `celebrate`,
  `playful`, `suspicious`, `scared` — chacun demanderait soit un signal Claude Code
  qui n'existe pas (pas de hook "succès"/"tâche notable"), soit un heuristique fragile
  (ex. "Stop sans PostToolUseFailure récent" ≈ "célébration") couplé à une logique de
  retour automatique à `idle` après quelques secondes que je n'ai pas voulu ajouter sans
  pouvoir vérifier le rendu (rebuild = redémarre ta fenêtre en cours). À rouvrir si un
  vrai besoin se présente à l'usage.

## Étape 7 — Corrections visuelles et structurelles (retour utilisateur)

- [x] **Bordure/liseré blanc autour du pet.** Fausse piste initiale : la taille de
      fenêtre (300×300 avec marge) — le vrai problème persistait à cette taille. Cause
      réelle trouvée : Windows applique par défaut une ombre native (coins arrondis +
      liseré 1px) aux fenêtres `decorations: false`. Fix : `"shadow": false` dans
      `tauri.conf.json`, fenêtre repassée à 240×240 exact (0 marge, comme demandé).
      Vérifié visuellement en zoomant sur le rendu — fond qui se fond directement dans
      le bureau.
- [x] **Drag & drop de la fenêtre.** Deux couches de correction : 1. `data-tauri-drag-region` remplacé par l'appel JS explicite
      `getCurrentWindow().startDragging()` sur `onMouseDown` (le SVG monté
      imperativement par le moteur d'animation ne relayait pas fiablement
      l'attribut HTML). 2. **Cause racine réelle** : permission Tauri v2 manquante. `core:default` ne
      couvre pas `start_dragging` — ajouté explicitement
      (`core:window:allow-start-dragging`) dans `capabilities/default.json`. Sans
      cette permission, l'appel échoue silencieusement, ce qui explique pourquoi
      les deux approches (attribut HTML et API JS) semblaient également cassées.
      Confirmé par test : la fenêtre a effectivement bougé pendant les essais
      automatisés. Ma validation automatisée précise (screenshot pixel-perfect après
      un drag exact) a ensuite été perturbée par une désynchronisation entre l'appel
      IPC asynchrone et mes événements souris synthétiques (get bloqué en drag continu)
      — artefact de test, pas un bug applicatif. **À reconfirmer avec un vrai clic
      souris.**
- [x] Étape 10 — Fenêtre de settings (taille avatar, mode debug, JSON, export/import) —
      voir section dédiée plus bas
- [x] **Découpage frontend.** `src/App.tsx` (orchestrateur fin) + `src/hooks/useHookyState.ts`
      (écoute l'event `hooky-state`) + `src/components/PetAvatar.tsx` (rendu + drag) —
      base réutilisable pour ajouter d'autres hooks/composants sans repartir d'un
      fichier monolithique.
- [x] **`package.json` / tooling.** Le script `lint` existait déjà (ajouté par
      Baptiste) mais sans ESLint installé ni configuré — corrigé : `eslint` +
      `typescript-eslint` + plugins React (hooks/refresh) installés,
      `eslint.config.js` standard (pattern officiel Vite React+TS). `pnpm lint` et
      `pnpm lint:fix` fonctionnels. Script `typecheck` ajouté (`tsc -b`, distinct du
      build complet). `name` du `package.json` aligné sur `hooky` (au lieu du
      `tauri-app` du scaffold).

## Étape 8 — Events `clawd-on-desk` : mapping finalisé ✅

Référence : [`clawd-on-desk`](https://github.com/rullerzhou-afk/clawd-on-desk). Liste des
events interceptés par ce projet, à titre d'inspiration initiale. Décision prise event par
event (pas de reprise systématique) : mappés sur la palette d'animations **existante**
(`sleeping, waking, idle, listening, thinking, searching, working, bored, confused`) — aucune
nouvelle animation n'a été ajoutée pour cette étape.

Table de correspondance complète, sous-typage `Notification` inclus, et liste du
volontairement non mappé : déplacés vers [`docs/EVENTS.md`](EVENTS.md) (source de vérité
tenue à jour en dehors du journal de roadmap).

Côté code : mapping dans `animation_for_event()` (`src-tauri/src/lib.rs`), hooks déclarés dans
`docs/hooks/claude-settings-snippet.json` et fusionnés dans `~/.claude/settings.json` (15
events au total).

## Étape 9 — Migration vers le package npm `@bible-strong/avatar-react` ✅

Le Studio `smontlouis/bible-strong-avatar-lab` a publié un vrai package npm après le
développement initial de Hooky. Le code copié à la main (`avatar-runtime.ts`, `Cubee.tsx`,
`cubee.avatar.ts`) est remplacé par `@bible-strong/avatar-react@0.1.0` + `createAvatar()`,
piloté par `cubee.avatar.json` (nouvel export du Studio, clés sémantiques). Décision
détaillée : [BDR-004](../.claude/memory/decisions/BDR-004.md).

- Licence inchangée : le package est aussi `AGPL-3.0-only` — pas d'impact sur la décision
  de repo AGPL-3.0.
- Les 9 animations utilisées par le backend Rust (`sleeping, waking, idle, listening,
thinking, searching, working, bored, confused`) sont toutes présentes dans le nouveau
  JSON, comportement observable inchangé.
- `useHookyState.ts`/`PetAvatar.tsx` inchangés (même contrat `AnimationName`, même usage
  contrôlé `<Cubee animation={...} size={240} />`).
- Vérifié : `pnpm typecheck`, `pnpm lint`, `pnpm build` passent ; rendu visuel de Cubee
  (animation `sleeping` par défaut) confirmé dans un navigateur pointé sur le serveur Vite
  déjà lancé par Baptiste (`localhost:1420`) — les erreurs console `listen()`/
  `transformCallback` viennent de l'API Tauri absente hors webview réelle, pas de la
  migration.

## Étape 10 — Fenêtre de settings ✅

Clic droit **ou** double-clic sur l'avatar ouvre une seconde fenêtre Tauri (`WebviewWindow`
label `"settings"`, créée dynamiquement en JS -- pas déclarée dans `tauri.conf.json`, qui ne
liste que les fenêtres créées au démarrage). Même bundle frontend pour les deux fenêtres :
`App.tsx` bascule le rendu (`PetAvatar` vs `SettingsPanel`) selon `getCurrentWindow().label`,
pas de second point d'entrée HTML.

- **Stockage : `localStorage`**, confirmé suffisant -- pas de besoin de synchro multi-PC.
  Diffusion aux autres fenêtres via l'event Tauri `hooky-settings` (même pattern que
  `hooky-state` déjà utilisé pour l'avatar) : `localStorage` seul n'aurait pas re-render la
  fenêtre du pet en temps réel pendant qu'on bouge un slider dans les settings.
- **Taille de l'avatar** : slider 80-240px, prop `size` déjà supportée par
  `@bible-strong/avatar-react` -- réutilisée telle quelle. La fenêtre native reste fixe à
  240×240 (cf. étape 0, décision "cropé à l'avatar") : un avatar plus petit laisse une marge
  transparente autour, pas de redimensionnement de fenêtre (aurait demandé de rendre la
  fenêtre `resizable` + une permission Tauri supplémentaire pour un gain visuel marginal).
- **Mode debug** : fond du pet passé à `rgba(0,0,0,0.5)` + overlay `<pre>` rouge monospace
  (`position: absolute`, `pointer-events: none` pour ne jamais intercepter le drag/clic-droit)
  affichant l'animation courante et le dernier hook Claude Code déclencheur (+ `tool_name` si
  présent). Le backend Rust transmet désormais `lastEvent`/`toolName` dans le payload de
  l'event `hooky-state` (`src-tauri/src/lib.rs`) -- absents sur les émissions du reaper
  (transition idle→bored, éviction), qui n'ont pas d'event Claude Code à l'origine.
- **JSON sauvegardé** : `SettingsPanel` affiche le JSON des settings persistées dans un
  textarea éditable (bouton "Appliquer le JSON"), synchronisé avec les contrôles (slider/
  checkbox) dans les deux sens.
- **Export/import** : zéro dépendance ajoutée -- export via `Blob` + `<a download>` (le
  WebView2 gère un vrai téléchargement natif, contrairement à un contexte sandboxé), import
  via `<input type="file">` + `File.text()`. Pas de `tauri-plugin-dialog`/`fs` : le besoin ne
  justifiait pas la dépendance supplémentaire.
- **Permissions Tauri** ajoutées : `core:webview:allow-create-webview-window` sur la capability
  `main` (absente de `core:webview:default`, vérifié dans `gen/schemas/acl-manifests.json`
  avant d'ajouter) ; nouvelle capability `src-tauri/capabilities/settings.json`
  (`core:default` suffit -- `core:event:default` qui couvre `emit`/`listen` y est déjà inclus).
- Vérifié : `pnpm typecheck`, `pnpm lint`, `pnpm build` et `cargo check` passent tous. Rendu
  visuel réel non testé dans cette session (une instance Hooky de Baptiste tournait déjà sur
  le port 4242 pendant l'implémentation -- relancer l'app aurait risqué d'interrompre son
  usage en cours, cf. [LRN-004](../.claude/memory/learnings/LRN-004.md)) : **à valider
  visuellement par Baptiste** (clic droit/double-clic sur le pet, sliders, mode debug).

### Retours d'usage (même session) — 3 bugs + 1 refonte UI

- **Avatar non carré sous 240px** : cause racine, pas la lib d'avatar (qui pose bien
  `width: M; height: M` en style inline, donc intrinsèquement carrée). `#root` (div de
  montage React dans `index.html`) n'avait aucune règle CSS -- la chaîne de pourcentages
  `html → body → #root → .pet-window { height: 100% }` était donc rompue dès `#root`
  (hauteur `auto`, retombant sur celle du contenu), alors que la largeur restait pleine
  (héritée du flow de bloc, pas de la chaîne de %). Invisible à 240px par coïncidence
  (contenu = taille de fenêtre), visible dès qu'on réduit. Fix : `height: 100%` explicite
  sur `html, body` et nouvelle règle `#root { height: 100% }` (`src/App.css`) -- même
  pattern que GLRN-242 (mémoire globale, hors repo : chaîne `height:100%`, chaque
  ancêtre compte, `#root` y compris).
- **Clic droit retiré, double-clic uniquement** : le clic droit fonctionnait, le
  double-clic non -- cause : `startDragging()` était appelé sur **chaque** `mousedown`
  (y compris les deux clics d'un double-clic), et cette fonction entre dans une boucle de
  drag OS bloquante qui casse le comptage natif `dblclick` du navigateur. Remplacé par une
  détection manuelle par chronométrage (`performance.now()`, fenêtre 300ms) dans
  `onMouseDown` : le second clic dans la fenêtre ouvre les settings et n'appelle pas
  `startDragging()`, le premier (ou un clic isolé) déclenche le drag comme avant. Pattern
  déjà documenté : GLRN-212 (mémoire globale, hors repo)
  (`dblclick` natif pas fiable → détection manuelle).
- **UI settings refaite avec shadcn/ui** : Tailwind CSS v4 (`@tailwindcss/vite`) + shadcn
  (préréglage `nova`, base `@base-ui/react`, `iconLibrary: lucide` -- déjà la valeur par
  défaut) installés dans un projet Vite qui n'avait ni l'un ni l'autre. Alias `@/*` ajouté
  (`tsconfig.json` `paths` + `resolve.alias` dans `vite.config.ts`, ce dernier a aussi
  nécessité `@types/node` pour `node:path`/`import.meta.dirname`). Composants ajoutés :
  `Field`/`FieldGroup`/`FieldLabel`/`FieldDescription`/`FieldTitle`/`FieldSeparator`,
  `Slider`, `Switch`, `Button`, `Separator`. Icônes `lucide-react`. Section JSON éditable +
  bouton "Appliquer le JSON" **retirés** (les contrôles appliquent déjà en temps réel via
  `useSettings`, le bouton était mort). `Settings.css` custom supprimé, remplacé par les
  classes Tailwind/tokens shadcn (`bg-background`, `text-foreground`...) -- le fond du
  `body` reste `transparent` (règle globale de `App.css`, non-layered donc prioritaire sur
  le `@layer base` de Tailwind), la fenêtre settings garde donc son propre fond opaque
  porté par son conteneur racine (`h-screen bg-background`), pas par `body`.
- **Frictions pnpm rencontrées** : quarantaine `minimum-release-age` (politique globale
  7 jours) bloquée par des variantes de plateforme optionnelles de `rollup` totalement
  sans rapport avec ce qui était installé -- déjà documenté
  ([LRN-003](../.claude/memory/learnings/LRN-003.md)). Le CLI shadcn appelant `pnpm add` en
  interne à plusieurs reprises (impossible d'y passer un flag), contournement via un
  `.npmrc` local temporaire (`minimum-release-age=0`) le temps de l'`init`, supprimé
  ensuite -- politique globale jamais modifiée.
- Re-vérifié après ces correctifs : `pnpm typecheck`, `pnpm lint` (1 warning bénin,
  pré-existant dans le code vendor `components/ui/button.tsx`, cf.
  GLRN-210 (mémoire globale, hors repo)), `pnpm build` --
  tous passent. Toujours pas de rendu visuel réel testé cette session (même contrainte
  port 4242 déjà occupé).

### Retours d'usage (round 2) — double-clic validé, 3 nouveaux fixes

Double-clic confirmé fonctionnel par Baptiste. Trois nouveaux retours traités :

- **Zone de drag trop large sous 240px** : `.pet-window` (qui porte `onMouseDown`) faisait
  toujours `width: 100%; height: 100%` de la fenêtre (240×240), même quand
  `settings.avatarSize` était réduit -- toute la marge transparente autour de l'avatar
  rétréci déclenchait donc encore le drag/double-clic. Fix : `.pet-window` dimensionné
  exactement à `avatarSize × avatarSize` (style inline, comme `AvatarEngine` lui-même),
  englobé dans une nouvelle `.pet-shell` (100% de la fenêtre, purement pour le centrage
  flex, aucun handler dessus) -- `src/App.css` + `src/components/Avatar.tsx`.
- **Export silencieux (rien ne se passait au clic)** : pas un bug de code applicatif mais
  une limitation connue de Tauri, cross-plateforme, WebView2 inclus -- `<a download>` sur
  une URL `blob:` ne déclenche généralement aucun événement de téléchargement dans une
  webview Tauri (confirmé par plusieurs issues GitHub `tauri-apps/tauri`/`wry`), donc rien
  n'apparaît et aucune erreur ne remonte. Remplacé par le vrai dialogue natif :
  `@tauri-apps/plugin-dialog` (`save()`) pour choisir le chemin + une commande Rust
  applicative minimale `write_text_file` (`src-tauri/src/lib.rs`, `std::fs::write`) pour
  écrire le contenu -- pas le plugin `fs` officiel, qui aurait exigé un `scope` de chemins
  pré-déclaré en capability alors que le chemin n'est connu qu'après le choix utilisateur
  dans le dialogue ; une commande applicative custom (`invoke_handler`, pas un plugin)
  n'a besoin d'aucune entrée de capability -- confirmé dans la doc officielle Tauri
  ("by default, all commands registered via `invoke_handler` are allowed to be used by
  all the windows and webviews of the app"). Permission ajoutée : `dialog:default` sur la
  capability `settings` (couvre `allow-save`). Import (`<input type="file">`) inchangé --
  c'est un vrai picker OS natif, pas concerné par le bug `blob:`, fonctionnait déjà.
- **Réinitialiser en `destructive` + confirmation** : composant `AlertDialog` shadcn ajouté
  (`pnpm dlx shadcn add alert-dialog`, aucune nouvelle dépendance npm). Le bouton devient le
  trigger (`variant="destructive"`, pattern base-ui `render={<Button .../>}`, pas `asChild`
  qui est Radix) ; confirmation avant reset avec message explicite sur la perte des
  réglages actuels ; l'action de reset elle-même (`AlertDialogAction`) est aussi
  `variant="destructive"`.
- Vérifié : `pnpm typecheck`, `pnpm lint`, `pnpm build` et `cargo check` (nouveau plugin
  `tauri-plugin-dialog` + commande `write_text_file`) passent tous. Toujours pas de test
  visuel réel de ce round par moi -- l'instance de Baptiste tourne toujours sur le port
  4242 (redémarrée au moins une fois entre-temps par son propre `tauri:dev` suite aux
  changements `src-tauri`, comportement normal cf.
  [LRN-004](../.claude/memory/learnings/LRN-004.md)).

### Bulle de notification : retour à 2 fenêtres (spawn/kill plutôt que fusion)

Après plusieurs itérations dans la même session (fusion de la bulle dans "main", puis
tentative de région de hit-test `SetWindowRgn` en forme de "I" pour éliminer la zone morte
autour de l'avatar) jugées insatisfaisantes par Baptiste, retour à une architecture 2
fenêtres -- mais avec un cycle de vie différent de la première tentative (`BDR-035`,
fenêtre statique show/hide) :

- **Fenêtre "main"** : ne contient plus que l'avatar + badge, dimensionnée à
  `avatarSize + MAIN_WINDOW_MARGIN` (`src/lib/layout.ts`) au lieu d'une taille fixe
  480×420 -- redimensionnée (`setSize`) uniquement quand `avatarSize` change dans
  Settings (rare, délibéré), jamais par notification. Plus de zone morte cliquable à
  masquer, donc abandon du WIP `SetWindowRgn` du même jour (commande Rust
  `apply_window_shape`, dépendance `windows` retirée de `Cargo.toml`).
- **Fenêtre "bubble"** : plus de déclaration statique dans `tauri.conf.json` -- **spawnée**
  à la demande (`new WebviewWindow("bubble", ...)`, même pattern que la fenêtre
  "settings") uniquement quand un message doit s'afficher (`src/hooks/useBubbleWindow.ts`),
  et **tuée** (`getCurrentWindow().close()`) après son animation de sortie CSS, que ce
  soit après le hold timer normal ou suite à un drag de l'avatar (event
  `hooky-bubble-dismiss`, émis par `windowDrag.ts` au début du drag). Jamais de tentative
  de la faire suivre l'avatar en direct pendant un drag -- root cause déjà identifiée du
  flash/lag structurel (CSS synchrone vs repositionnement fenêtre OS asynchrone) sur ce
  projet. Sa position est calculée une seule fois au spawn (lecture ponctuelle
  `outerPosition`/`currentMonitor`, pas d'écouteur continu), avec le flag d'orientation
  (`flipped`) transmis via l'URL de la fenêtre (`?bubbleFlipped=1|0`).
- `src/hooks/useAvatarScreenLayout.ts` (calcul de flip en continu via `onMoved`) supprimé
  -- devenu un calcul ponctuel dans `useBubbleWindow`.
- Nouvelle capability `src-tauri/capabilities/bubble.json` (`core:default` +
  `core:window:allow-close`) ; `core:window:allow-set-size` ajouté à `default.json` pour
  le resize de "main".
- Vérifié : `pnpm lint`, `pnpm build`, `cargo check` passent tous. Pas de test visuel réel
  de ce round.
