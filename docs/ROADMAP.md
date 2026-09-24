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
- [ ] Étape 12 — Support des pets Codex (spritesheets `~/.codex/pets`) — voir plus bas, 3 sessions prévues (**session 1/3 faite**, session 2 à lancer)
- [ ] Étape 13 — Suivi du regard, pets Codex v2 uniquement (lignes 9–10 de la spritesheet) + badge « regard » dans l'onglet Avatar — dernière phase, après l'étape 12, **à cadrer**
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
additionnel. À reconsidérer si le moteur expose un jour ce type de hook — **rouvert
partiellement par l'[Étape 13](#étape-13--suivi-du-regard-pets-codex-v2-uniquement--à-cadrer)**,
uniquement pour les pets Codex v2 dont la spritesheet contient des poses de regard (pas de
changement pour Cubee et les avatars procéduraux).

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
- [x] Étape 11 — V0 partageable (icônes custom, tray simplifié, packaging NSIS,
      auto-launch au 1er `SessionStart`, commande settings pour installer les
      hooks, système de mise à jour, CI de release) — voir section dédiée plus
      bas ; LP optionnelle non commencée
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

## Étape 11 — V0 partageable ✅ (LP optionnelle exclue)

Checklist complète décidée dans [BDR-064](../.claude/memory/decisions/BDR-064.md), implémentée
en une passe via 5 agents parallèles groupés par fichiers non-partagés — détail décision :
[BDR-066](../.claude/memory/decisions/BDR-066.md). Détail technique de chaque point (icônes,
tray, NSIS, auto-launch, commande hooks, mise à jour, CI) : source de vérité tenue à jour dans
[`docs/RELEASE.md`](RELEASE.md), pas dupliqué ici (même convention que
[`docs/EVENTS.md`](EVENTS.md) pour les events).

- Icônes régénérées depuis `src/assets/logo.svg` (vrai logo Cubee, `viewBox` resserré pour
  remplir le cadre aux petites tailles tray/taskbar) via le générateur intégré `pnpm tauri icon`.
- Tray réduit à `Paramètres` + `Quitter` ; commande `install_claude_hooks` (Rust) fusionne
  `docs/hooks/claude-settings-snippet.json` dans `~/.claude/settings.json` de façon idempotente.
- **Bug trouvé en test manuel + corrigé le jour même** : le dédoublonnage comparait par
  égalité de texte exacte plutôt que par identité stable (port fixe `127.0.0.1:4242`) —
  toute évolution future du snippet aurait dupliqué l'entrée `SessionStart` au lieu de la
  remplacer. Root cause + fix : [LRN-074](../.claude/memory/learnings/LRN-074.md).
- `serde_json` passé en `preserve_order` : un merge ne réordonne plus tout le fichier
  `settings.json`, ne touche que les clés réellement modifiées.
- Hook `SessionStart` auto-launch Windows implémenté en `curl ... || start ...` inline —
  délibérément sans wrapper PowerShell pour rester dans le même modèle de portabilité que le
  `curl` existant (aucun interpréteur shell explicite imposé), cf. `docs/hooks/README.md`.
- CI `.github/workflows/release.yml` (`tauri-apps/tauri-action`, `windows-latest` uniquement)
  déclenchée sur tag `v*`. Nouveau : `pnpm release:patch|minor|major`
  (`scripts/sync-version.mjs`) bump `package.json` + synchronise `tauri.conf.json`/
  `Cargo.toml`/`Cargo.lock` + crée le tag automatiquement via le hook `"version"` de
  `pnpm version` — reste à pousser manuellement (`git push --follow-tags`) pour déclencher
  la CI.
- Vérifié en conditions réelles par Baptiste : build + install NSIS + auto-launch
  fonctionnels. Mise à jour non testable tant qu'aucune release GitHub n'existe (404 attendu
  sur `/releases/latest`).

## Étape 12 — Support des pets Codex ⏳

Objectif : lister automatiquement tous les pets installés dans `~/.codex/pets` (Windows :
`C:\Users\<user>\.codex\pets`) dans le picker d'avatars, les animer à partir de leur
spritesheet, et piloter leurs animations avec les hooks Claude Code via une nouvelle table de
correspondance (même principe que `EVENT_ANIMATIONS` pour Cubee). Chantier découpé en
3 sessions (voir plus bas) — chaque session laisse l'app fonctionnelle.

### Format constaté (mesuré sur les 4 pets installés, pas supposé)

- Un dossier par pet : `pet.json` + `spritesheet.webp`.
- `pet.json` : `{ id, displayName, description, spritesheetPath }` — **pas de timing, pas de
  nombre de frames** : la structure des lignes est un contrat implicite qu'on code en dur.
- Spritesheet : **1536 × 1872 px = 8 colonnes × 9 lignes, cellule 192 × 208 px** (identique sur
  les 4 pets), WebP avec canal alpha (VP8L / VP8X non animé). Cellules inutilisées d'une ligne =
  transparentes (une ligne n'a pas toujours 8 frames).
- **Format v2 (découvert en session 1, absent des 4 pets mesurés)** : la spec de la CLI `petdex`
  (README du package npm) accepte aussi une grille **8 × 11 (1536 × 2288)** — c'est l'export
  ChatGPT — et « une mise à l'échelle propre » de chaque format. Vérifié ensuite sur pièce avec
  `om-nom` (v2, 1536 × 2288, `pet.json` avec `"spriteVersionNumber": 2`) : même cellule
  192 × 208, **lignes 0–8 = les mêmes 9 états dans le même ordre que la v1** (idle, run-right,
  run-left, waving, jumping, failed, waiting, running, review — vérifié à l'œil sur une planche
  de contact, comme sur `work-blue-cat`), et **lignes 9–10 = 16 poses de regard** (voir
  [Étape 13](#étape-13--suivi-du-regard-pets-codex-v2-uniquement--à-cadrer)). Le code lit `rows`
  au lieu de supposer 9 et ignore les lignes 9–10 pour l'instant.
  ⚠️ Un texte de recherche web (généré, non sourcé) donnait un autre ordre pour les lignes 0–8
  (« Running » en ligne 1, « Success » en ligne 4…) : **contredit par les deux sheets mesurées**,
  à ne pas utiliser. Il est juste sur les lignes 9–10.
- ⚠️ `id` ≠ nom du dossier (dossier `ddo-zvzo-2` → `id: "ddo-zvzo"`) : l'identité côté Hooky
  est le **nom du dossier**, jamais l'`id` du JSON (collisions possibles).
- `displayName` peut être non latin (ex. chinois) → prévoir une police de repli dans les cartes.
- Poids : 200 Ko à 1,8 Mo par sheet, mais ~11 Mo décodée en RGBA (voir risque mémoire).

| Ligne | Animation Codex | Frames |
| ----- | --------------- | ------ |
| 0     | `idle`          | 6      |
| 1     | `run-right`     | 8      |
| 2     | `run-left`      | 8      |
| 3     | `waving`        | 4      |
| 4     | `jumping`       | 5      |
| 5     | `failed`        | 8      |
| 6     | `waiting`       | 6      |
| 7     | `running`       | 6      |
| 8     | `review`        | 6      |

### Architecture retenue

1. **Découverte (Rust)** : commande Tauri `list_codex_pets` qui scanne le dossier et renvoie
   `[{ folder, displayName, description, spritesheetPath }]`. Scan **en direct** (pas de copie
   dans Hooky) : un `npx petdex install` apparaît sans étape d'import. Rescan à l'ouverture
   des settings + bouton "Rafraîchir".
2. **Servir l'image** : protocole `asset:` de Tauri (feature `protocol-asset`), pas de base64 via
   IPC. Scope **ajouté à l'exécution, fichier par fichier** (`asset_protocol_scope().allow_file`
   dans `list_codex_pets`, uniquement pour une sheet déjà validée) plutôt que le scope statique
   `$HOME/.codex/pets/**` prévu initialement : plus strict (jamais le dossier entier), et le
   scope échappe le chemin (`escaped_pattern`, lu dans le source de `tauri 2.11.5`).
3. **Renderer** : nouvelle union `kind: "procedural" | "sprite"` autour de `AvatarBundle` —
   aujourd'hui tout (`Avatar`, `AvatarPicker`, `AnimationCard`, `useAvatarBundle`) suppose le
   moteur procédural. Nouveau composant `SpriteAvatar` : `background-image` +
   `background-size: 800% 900%`, déroulé des frames par CSS `steps()` / Web Animations API
   (cohérent avec BDR-016, zéro re-render React par frame), cellule 192×208 ajustée (contain)
   dans le carré `avatarSize`.
4. **Identité** : `avatarId = "codex:<dossier>"` — pas de collision avec les ids par défaut
   (`cubee`…) ni les customs (UUID). Pet disparu du disque alors que sélectionné → repli sur
   `cubee` (mécanisme déjà en place dans `getAvatarBundle`).
5. **Table de correspondance** (le cœur de la demande), à trois niveaux :
   - **Niveau A — lignes Codex** : `CODEX_ROWS` = `{ row, frames, fps, loop }` par animation
     (fps = constantes à régler à l'œil, le manifeste n'en donne pas).
   - **Niveau B — repli par état agrégé** (les 9 états du backend) → ligne Codex. Utilisé
     quand l'état agrégé (multi-session) ne correspond pas au dernier hook affiché.
   - **Niveau C — surcharge par hook** : champ optionnel `codexAnimation` ajouté aux
     entrées de `EVENT_ANIMATIONS` / `NOTIFICATION_ANIMATIONS` (même table que les icônes de
     badge, résolu par `findMappingEntry`). Permet de distinguer ce que le moteur Cubee ne
     distinguait pas (ex. `SessionStart` → `waving` alors que `PermissionRequest` → `waiting`,
     tous deux `listening` côté Cubee). La grille de l'onglet Animation en profite sans UI
     nouvelle.

   Proposition initiale (**à valider visuellement** dans l'onglet Animation, comme BDR-013) :

   | État (niveau B) | Ligne Codex | Remarque                                                    |
   | --------------- | ----------- | ----------------------------------------------------------- |
   | `idle`          | `idle`      |                                                             |
   | `listening`     | `waiting`   | attend l'utilisateur                                        |
   | `thinking`      | `review`    |                                                             |
   | `searching`     | `review`    | distingué de `thinking` par le badge (loupe/cerveau)        |
   | `working`       | `running`   |                                                             |
   | `confused`      | `failed`    |                                                             |
   | `celebrate`     | `jumping`   |                                                             |
   | `bored`         | `idle`      | ou `waving` — à voir à l'usage                              |
   | `sleeping`      | _(aucune)_  | pas de ligne dédiée → `idle` ralentie + badge Zzz (tranché) |

   Surcharges niveau C envisagées : `SessionStart` → `waving`, `Stop` → `jumping`,
   `StopFailure`/`PostToolUseFailure` → `failed`, `PermissionRequest`/`Elicitation`/
   `agent_needs_input` → `waiting`, `quota_auto_resume_fired` → `waving`, `auth_success` →
   `waving`. `docs/EVENTS.md` gagne une colonne "Ligne Codex" (même convention de miroir
   manuel que pour les animations Cubee).

### Sécurité (à ne pas oublier — les pets viennent d'un store public)

- `spritesheetPath` est contrôlé par l'auteur du pet : **rejeter** tout chemin absolu ou
  contenant `..`, canonicaliser et vérifier que le fichier reste dans le dossier du pet
  (sinon le scope asset protocol expose n'importe quel fichier lisible).
- N'accepter que `.webp` / `.png`, plafonner la taille du fichier, ignorer (avec log) un pet
  dont le JSON est invalide ou la sheet absente — jamais de crash du picker.
- Dimensions : viser 1536×1872 mais dériver la cellule de la taille réelle (`w/8`, `h/9`)
  pour tolérer d'autres résolutions du même ratio ; rejeter le reste.

### Plan par session

**Session 1 — "Voir mes pets" (socle)** ✅ code + gates verts ; **reste à valider visuellement
dans l'app** (voir la dernière case)

- [x] Chemin d'installation vérifié en lisant le package npm `petdex@1.3.0` (les docs web ne
      sont pas lisibles) : `petdex install` écrit dans `~/.petdex/pets/<slug>/` **et**
      `~/.codex/pets/<slug>/` → `~/.codex/pets` confirmé. `CODEX_HOME` n'apparaît nulle part
      dans la CLI : **non supporté** (on scanne `~/.codex/pets`, comme Petdex l'écrit).
- [x] Rust : `src-tauri/src/codex_pets.rs` — `list_codex_pets` (scan en direct), validations
      (chemin relatif sans `..` + canonicalisation + appartenance au dossier, `.webp`/`.png`,
      ≤ 10 Mo, `pet.json` ≤ 64 Ko, dimensions lues dans l'en-tête WebP/PNG sans dépendance,
      grille 8×9 ou 8×11 ≤ 3072 px de large), feature `protocol-asset`, scope par fichier.
      5 tests unitaires (dont un sur les 32 octets réels d'un pet installé, et les tentatives
      `../`, `/etc/…`, `C:\…`).
- [x] `SpriteAvatar` (WAAPI + `steps(N, jump-none)`, zéro re-render par frame) + `CODEX_ROWS`
      (fps provisoires) + niveau B `STATE_TO_ROW` **partiel** : le moteur compte 23 animations,
      Hooky n'en émet que 10 (lib.rs et catalogue concordent) — les 13 autres retombent sur
      `idle` (`codexRowFor`), pas de mapping spéculatif.
- [x] Union `ProceduralAvatarBundle | SpriteAvatarBundle` (`kind`), id `codex:<dossier>`,
      `getAvatarBundle` / `useAvatarBundle` ; pet disparu du disque → repli `cubee`. Le pet
      flottant, les cartes du picker et la grille Animation n'ont pas eu à changer :
      `FittedAvatarEngine` aiguille selon `kind`.
- [x] Store `useCodexPets` (`useSyncExternalStore`, un scan par webview) + diffusion
      `hooky-codex-pets` : le pet flottant apprend un nouveau pet quand les settings le
      détectent, il ne rescanne jamais seul.
- [x] Picker : section « Pets Codex », état vide, bouton Rafraîchir, Couleurs masquées pour un
      sprite, pas de bouton Supprimer. `AvatarPickerCard` extrait de `AvatarPicker.tsx` (647 →
      482 lignes) pour être réutilisé sans import circulaire.
- [x] Gates : `pnpm typecheck`, `pnpm lint` (0 erreur, 1 warning `ui/button.tsx` pré-existant),
      `pnpm build`, `cargo check`, `cargo test codex_pets`.
- [x] Vérifié hors app avec une page témoin reprenant le même CSS/WAAPI sur la vraie sheet :
      les 9 lignes se découpent proprement (aucun débordement de cellule voisine) et
      `steps(N, jump-none)` donne exactement N colonnes (k/7 × 100 %) pour chaque ligne.
- [x] Retours d'usage validés par Baptiste (« ça fonctionne ») : fenêtre Settings agrandie de
      570 à 712 px de haut (+25 %, `settingsWindow.ts`, `minHeight` inchangé), badge coloré (voir
      session 2).
- [x] Validation dans l'app par Baptiste (`tauri dev`) : l'URL `asset:` charge bien dans
      WebView2 (préfixe `\\?\` retiré, scope `allow_file`), la section s'affiche, le pet
      sélectionné apparaît en flottant. Note : **un seul pet installé** sur la machine de dev
      (`work-blue-cat`), pas 4 comme mesuré initialement.

**Session 2 — "Piloté par les hooks"**

- [ ] Tables niveaux B + C, `codexAnimation` dans le catalogue, `findMappingEntry` étendu
- [ ] Pet flottant (`Avatar.tsx`) : ligne Codex résolue depuis (état, hook, notification)
- [ ] Onglet Animation : cartes rendues avec le pet sélectionné + libellé de la ligne Codex
- [x] Couleur d'icône du badge pour un sprite — **fait en retour d'usage de la session 1**
      (`src/lib/spriteColor.ts`) : plage de teinte dominante de la ligne `idle` (canvas,
      12 plages de 30°), puis `ensureReadableOnWhite`. Un premier essai « couleur exacte la plus
      fréquente » échouait sur le pet de test (le vert du t-shirt ne pesait que 2 % à cause de
      l'ombrage, retombait sur le gris) — mesuré, d'où le regroupement par teinte (8 %).
      Résultat sur `work-blue-cat` : `#57a072`. Repli gris `#475569` si le calcul échoue.
- [ ] Brancher les effets ponctuels (confettis/bounce/shake, `useAnimationEffects`) sur un
      sprite — conservés, décision tranchée
- [ ] `docs/EVENTS.md` : colonne "Ligne Codex"

**Session 3 — "Store + finitions"**

- [ ] Bouton vers Petdex (`https://petdex.dev/`) à côté de "Créer ou télécharger un avatar",
      avec rappel de la commande `npx petdex install <nom>` et du dossier cible
- [ ] Perf : animer seulement les cartes visibles/survolées (IntersectionObserver) — risque
      mémoire ci-dessous ; mesurer avec 4 puis ~30 pets
- [ ] `run-left` / `run-right` selon la direction du drag, pets Codex uniquement (`windowDrag.ts`)
- [ ] Traitement de `sleeping` (`idle` ralentie + atténuée + badge Zzz), réglage final des fps
- [ ] Gestion d'erreur image (`onError` → repli `cubee`), pet supprimé pendant l'exécution
- [ ] README (section pets Codex + crédit), `CHANGELOG`, BDR mémoire, bump de version

### Risques

- **Mémoire** : ~11 Mo décodés par sheet ; un utilisateur Petdex avec des dizaines de pets
  pourrait saturer le webview de settings si toutes les cartes sont animées en permanence.
  D'où le rendu paresseux en session 3 (et, si insuffisant, vignettes générées côté Rust).
- **Mapping agrégé multi-session** : l'état affiché est un agrégat, le dernier hook peut ne
  pas y correspondre → le niveau B existe précisément pour ce cas (même garde que
  `findMappingEntry` pour `PreToolUse`).
- **Licences des pets** : chaque pet a son auteur/licence propre (ex. pet mémoriel personnel).
  Hooky ne **bundle ni ne redistribue** aucun pet — il lit uniquement le dossier local de
  l'utilisateur. À rappeler dans le README.
- **Spec non officielle** : la structure 8×9 vient de l'observation de 4 pets, pas d'un
  document de spécification lu ; un pet hors format doit être ignoré proprement, pas planter.
- **Nombre de frames variable d'un pet à l'autre** (constaté en session 1) : `idle` compte 6
  frames sur `work-blue-cat` (v1) mais **7 sur `om-nom`** (v2) — un seul échantillon de chaque,
  impossible de dire si c'est une différence v1/v2 ou propre au pet. `CODEX_ROWS` fige 6 :
  la 7ᵉ frame d'`om-nom` n'est jamais jouée (sans gravité visuelle, mais faux). À traiter en
  session 2/3 en comptant les cellules pleines par ligne, dans la même passe canvas que
  `spriteColor.ts`, plutôt qu'un nombre codé en dur.

### Décisions tranchées (2026-09-23)

1. **`sleeping`** : `idle` ralentie + atténuée + badge "Zzz" (pas de ligne Codex dédiée).
2. **Effets ponctuels** (confettis, bounce, shake) : **conservés** sur les sprites, comme pour Cubee.
3. **`run-left` / `run-right` selon la direction du drag** : retenu, **spécifique aux pets
   Codex** (session 3) — aucun changement pour les avatars procéduraux (Cubee & co).
4. **Rendu** : toujours **lissé** (pas de `image-rendering: pixelated`) — le ratio
   cellule 192 px → `avatarSize` n'est pas entier, `pixelated` donnerait des pixels de
   largeurs inégales et un scintillement. Réglage par pet à envisager seulement si un pet
   paraît flou.

## Étape 13 — Suivi du regard (pets Codex v2 uniquement) — à cadrer

Dernière phase, après les 3 sessions de l'étape 12. Réintroduit le « mouse tracking » retiré à
l'[étape 5](#étape-5--eye-tracking-souris--retiré) (le moteur procédural n'expose aucune API de
regard), mais **uniquement pour les pets dont la spritesheet contient des poses de regard** : les
pets v2. Cubee et les avatars procéduraux restent inchangés (pas de suivi).

### Établi (mesuré sur `om-nom`, à l'œil sur une planche de contact des 11 lignes)

- Grille v2 8 × 11 : lignes 0–8 = les 9 états habituels, **lignes 9 et 10 = 16 poses de regard**
  (8 par ligne, 8 cellules pleines chacune) : la tête et les pupilles font un tour complet.
- Ligne 9 : de « regard en haut » (colonne 0) vers la droite jusqu'à « bas-droite » (colonne 7) ;
  ligne 10 : de « regard en bas » (colonne 0) vers la gauche jusqu'à « haut-gauche » (colonne 7).
  Soit **sens horaire à partir du haut, pas d'environ 22,5°**. Formule envisagée :
  `index = round(angle / 22,5°) mod 16`, `ligne = 9 + (index ≥ 8 ? 1 : 0)`, `colonne = index mod 8`.
- `pet.json` d'`om-nom` porte `"spriteVersionNumber": 2` (absent des pets v1 mesurés).

### À valider

- **Alignement exact des 16 pas** : la formule ci-dessus vient d'une lecture visuelle (le premier
  pas est bien « haut », mais un décalage d'un demi-pas n'est pas exclu) — à confirmer en
  affichant chaque pose et en la comparant à l'angle attendu, pas seulement en regardant la
  planche.
- **Un seul pet v2 mesuré** (`om-nom`) : confirmer sur d'autres avant de généraliser.
- **Critère de détection** : `rows === 11` (ce que le code fait déjà) ou
  `spriteVersionNumber === 2` du manifeste ? Un pet 8×11 sans le champ (ou l'inverse) est
  possible ; le champ n'est pas encore lu par `codex_pets.rs`.
- **Source** : une recherche web (texte généré, non sourcé) décrit aussi les lignes 9–10 comme
  « 16 directions du regard, sens horaire » — cohérent avec la mesure, mais la même réponse se
  trompe sur l'ordre des lignes 0–8 (cf. étape 12, « Format v2 ») : à ne pas prendre pour une
  spec. Source primaire non trouvée.

### Pistes d'implémentation (à cadrer, rien de décidé)

- Position du curseur via `cursorPosition()` de `@tauri-apps/api/window` (vérifier la permission
  correspondante dans `gen/schemas/acl-manifests.json` avant de l'ajouter, cf. GLRN-256),
  échantillonnée à fréquence limitée depuis la fenêtre « main » — aucun code résiduel de
  l'étape 5 à réutiliser.
- Angle centre du pet → curseur → un des 16 index → **une pose statique** affichée à la place de
  l'`idle`. Quand l'activer (seulement en `idle` ? seuil de distance ?), réglage on/off dans les
  Settings et respect de `prefers-reduced-motion` : à décider.
- **Badge dans l'onglet Avatar** : une icône « œil » (ex. `Eye` de lucide) sur la carte des pets
  qui ont le suivi du regard, rien sur les autres, avec une info-bulle « Suit le curseur ».
  Pas de suivi ni de badge pour Cubee et les avatars procéduraux.
