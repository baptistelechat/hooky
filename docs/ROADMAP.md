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
- [x] Étape 8 — Documenter les events `clawd-on-desk` non repris (table plus bas) — **décision "lesquels intégrer" volontairement différée**, pas un TODO oublié : pas de signal Claude Code exploitable identifié pour l'instant, à rouvrir si besoin réel constaté à l'usage
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

## Étape 8 — Events `clawd-on-desk` à documenter (V2, non implémentés)

Référence : [`clawd-on-desk`](https://github.com/rullerzhou-afk/clawd-on-desk). Liste des
events interceptés par ce projet, à titre d'inspiration — **pas de reprise systématique
prévue**, à évaluer un par un selon la valeur perçue avant d'ajouter du mapping.

| Event                            | Déjà dans Hooky ?              | Note                                                                                                                                                                                      |
| -------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SessionStart`                   | ✅                             | `waking`                                                                                                                                                                                  |
| `UserPromptSubmit`               | ✅                             | `thinking`                                                                                                                                                                                |
| `PreToolUse`                     | ✅                             | `working`/`searching`                                                                                                                                                                     |
| `PostToolUse`                    | ✅                             | retour `idle`                                                                                                                                                                             |
| `PostToolUseFailure`             | ✅                             | `confused`                                                                                                                                                                                |
| `Notification`                   | ✅                             | `listening`                                                                                                                                                                               |
| `Stop`                           | ✅                             | `idle`                                                                                                                                                                                    |
| `SessionEnd`                     | ✅                             | session retirée                                                                                                                                                                           |
| `SubagentStart` / `SubagentStop` | ⏸️ V2 déjà notée dans le brief | `curious`/`excited`                                                                                                                                                                       |
| `PermissionRequest`              | ❌ non exploré                 | chez clawd-on-desk, affichait les prompts de permission via le pet (serveur local dédié 127.0.0.1:23333) — pertinent si Hooky doit un jour relayer les demandes de permission Claude Code |
| `Elicitation`                    | ❌ non exploré                 | à documenter si un jour pertinent                                                                                                                                                         |
| `PreCompact` / `PostCompact`     | ❌ non exploré                 | signal de compaction de contexte, valeur perçue à évaluer                                                                                                                                 |
| `StopFailure`                    | ❌ non exploré                 | pendant échec de `Stop`                                                                                                                                                                   |

Pas d'action de code pour cette étape — décision à prendre au cas par cas plus tard.

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
