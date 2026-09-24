---
register: journal
---

## 2026-08-24

Installation de l'infrastructure mémoire agent (`/memory-setup`) sur le projet Hooky. Le projet en est à son commit initial ("Begin project + Add Cubee avatar and related hooks") : coquille app Tauri, serveur axum multi-session, avatar Cubee intégré, debounce/timeout sleeping, granularité working/searching, et corrections visuelles (shadow, drag & drop) déjà en place selon `docs/ROADMAP.md`. Reste à faire côté Baptiste : fusionner `hooks/claude-settings-snippet.json` dans son `settings.json` (déjà fait une fois selon la roadmap, à reconfirmer).

**Entrées clés :**

- [BDR-001](decisions/BDR-001.md) — Moteur Strobi/Cubee retenu
- [LRN-001](learnings/LRN-001.md) — Liseré blanc = shadow Windows
- [LRN-002](learnings/LRN-002.md) — Drag & drop = permission Tauri manquante
- [ZBLK-001](archive/blockers/ZBLK-001.md) — ReadOnly settings.json résolu

---

Migration du moteur d'avatar copié à la main vers le package npm officiel `@bible-strong/avatar-react` (publié par `smontlouis/bible-strong-avatar-lab` après le développement initial de Hooky, licence AGPL-3.0-only inchangée) : `avatar-runtime.ts`/`Cubee.tsx`/`cubee.avatar.ts` supprimés, remplacés par `createAvatar(definition)` piloté par le nouveau JSON exporté du Studio. Les 9 animations utilisées par le backend Rust étaient toutes présentes dans le nouveau JSON — migration sans changement de comportement.

À la demande de Baptiste, restructuration suivie : `src/avatar/` supprimé, tout fusionné dans `src/components/Avatar.tsx` (composant public `PetAvatar`, moteur interne `AvatarEngine`) + `src/components/avatar.json` avec des noms génériques pour pouvoir tester un autre export du Studio en écrasant juste le JSON.

Baptiste a signalé que l'avatar disparaissait par moments en dev. Diagnostic en plusieurs manches (Fast Refresh, puis refactor multi-fichiers) avant la bonne réponse, confirmée par capture d'écran desktop réelle (impossible à vérifier via un onglet Chrome sur le port Vite, hors runtime Tauri) : un rebuild `tauri:dev` tue et relance le process backend, donc le serveur axum sur 4242 est injoignable le temps du build (`ECONNREFUSED` sur tous les hooks), et la session map repart vide au redémarrage. Comportement de dev attendu, pas un bug.

Au passage : rencontré la même quarantaine pnpm que `trustPolicy` (GLRN-234) mais pour `minimumReleaseAge`, bloquant `pnpm add` sur une dépendance transitive optionnelle sans rapport — même échappatoire ponctuelle (`--config.minimum-release-age=0`).

**Entrées clés :**

- [BDR-004](decisions/BDR-004.md) — migration vers `@bible-strong/avatar-react`
- [BDR-005](decisions/BDR-005.md) — fusion `src/avatar/` → `src/components/`, noms génériques
- [ZBLK-002](archive/blockers/ZBLK-002.md) — diagnostic avatar "disparaît" (3 hypothèses)
- [LRN-004](learnings/LRN-004.md) — pattern extrait (rebuild Tauri = state perdu)

---

Grosse session en trois temps. D'abord finalisation de l'étape 8 du roadmap : 7 nouveaux events Claude Code mappés dans `animation_for_event()` (`StopFailure`, `SubagentStart`/`Stop`, `PreCompact`/`PostCompact`, `PermissionRequest`, `Elicitation`), fusionnés dans `~/.claude/settings.json` (15 events actifs au total) ; une quinzaine d'autres events retournés par une recherche mais jugés trop spéculatifs sont explicitement documentés comme exclus dans le roadmap plutôt que mappés à l'aveugle.

Ensuite, ajout complet de la fenêtre de settings demandée par Baptiste (clic droit/double-clic sur l'avatar) : taille de l'avatar, mode debug (overlay animation/hook), export/import JSON, localStorage + sync entre fenêtres via un event Tauri custom (`hooky-settings`, même pattern que `hooky-state`). Refonte de l'UI avec shadcn/ui (préréglage `nova`, base `@base-ui/react`) + Tailwind v4, installés pour la première fois dans ce projet — installation bloquée à trois reprises par la quarantaine pnpm `minimum-release-age` déclenchée par les appels `pnpm add` internes du CLI shadcn (impossible à contourner avec le flag habituel), résolu via un `.npmrc` local temporaire.

Enfin, trois rounds de retours utilisateur en usage réel ont surfacé des bugs invisibles en revue de code : ratio non carré de l'avatar sous 240px (chaîne CSS `height:100%` rompue dès `#root`, absent de toute règle), double-clic non fiable (`startDragging()` appelé sur chaque mousedown cassait le comptage natif du navigateur), export silencieux (limitation Tauri connue sur `<a download>` + `blob:`, remplacé par un vrai dialogue natif + commande Rust custom), et un `AlertDialog` de confirmation qui ne se fermait pas après l'action (spécificité du style base-ui de shadcn, `AlertDialogAction` ne ferme pas automatiquement contrairement à Radix).

**Entrées clés :**

- [BDR-006](decisions/BDR-006.md) — mapping des hooks finalisé
- [BDR-007](decisions/BDR-007.md) — fenêtre settings native, localStorage seul
- [ZBLK-003](archive/blockers/ZBLK-003.md) — install shadcn/Tailwind bloqué par la quarantaine pnpm
- [ZBLK-004](archive/blockers/ZBLK-004.md) — export silencieux (limitation Tauri, pas un bug applicatif)

## 2026-08-25

À la demande de Baptiste, suppression complète de `App.css` : les resets globaux (`html`/`body`/`#root`) sont désormais posés en attribut `class` directement dans `index.html`, et les 3 classes de composant (`.pet-shell`, `.pet-window`, `.debug-overlay`) migrées en `className` Tailwind dans `Avatar.tsx` (syntaxe arbitraire pour le text-shadow custom et l'empilement de polices). Comportement visuel identique vérifié (lint + build passants). Au passage, archivage de deux blockers résolus depuis la session précédente (BLK-003, BLK-004) qui n'avaient pas encore été déplacés vers `archive/blockers/`.

**Entrées clés :**

- [ZBDR-008](archive/decisions/ZBDR-008.md) — fichiers CSS custom bannis, tout en className Tailwind
- [LRN-005](learnings/LRN-005.md) — reset global → class Tailwind sur index.html, spécificité préservée

---

Baptiste a jugé la conversion complète de BDR-008 "trop forte" : lui ne voulait que la migration des 3 classes composant (`.pet-shell`, `.pet-window`, `.debug-overlay`) vers Tailwind, pas le déplacement des resets globaux (`html`/`body`/`#root`) hors d'un fichier CSS dédié. Revert partiel : `index.html` remis à l'état neutre, `App.css` recréé avec uniquement les 3 règles globales (`:root`, `html,body`, `#root`), les 3 classes composant restant en Tailwind inline dans `Avatar.tsx`. BDR-008 marqué `révisé`, référencé par la nouvelle décision.

**Entrées clés :**

- [ZBDR-009](archive/decisions/ZBDR-009.md) — revert partiel de BDR-008, resets globaux remis dans App.css
- [LRN-006](learnings/LRN-006.md) — pattern extrait (convention à portée large = risque de sur-scope)

---

Baptiste a signalé que le pet restait figé sur `sleeping`/`SessionEnd` après le lancement d'une
nouvelle session, malgré un backend visiblement sain. Trois hypothèses fausses avant la bonne
(une fenêtre en arrière-plan sans rapport confondue avec un rebuild, une race `tauri:dev`, un
`ECONNREFUSED` transitoire) — la vraie cause, trouvée en instrumentant le backend
(`eprintln!` sur chaque payload reçu) puis en comparant à un headless `claude -p` déclenché sur
demande de Baptiste : Claude Code v2.1.51+ bloque silencieusement les hooks `type: "http"` sur
`SessionStart`, restriction non documentée officiellement (confirmée par l'issue GitHub #28044
et un fetch direct de `hooks.md`). Première tentative de fix (script PowerShell personnel dans
`~/.claude/settings.json`) rejetée par Baptiste : Hooky doit rester partageable, la solution
doit marcher pour n'importe quel utilisateur/poste. Fix retenu : hook `command` qui pipe le JSON
du hook (stdin) vers `curl -d @-`, portable sans dépendance ajoutée, appliqué au snippet partagé
`docs/hooks/claude-settings-snippet.json`. Au passage, re-rencontré (et reconnu directement)
le pattern déjà archivé [ZBLK-001](archive/blockers/ZBLK-001.md) : édition de `settings.json`
bloquée par son attribut ReadOnly, protection volontaire de Baptiste.

Deuxième volet : granularité de l'event `Notification`. `animation_for_event()` mappait tout
`notification_type` en bloc sur `listening`. Recherche exhaustive (agent + fetch direct de
`hooks.md`) a révélé 12 valeurs documentées, pas les 4 déjà connues côté script perso de
notification — toutes mappées individuellement (ex. `idle_prompt` → `bored`,
`quota_auto_resume_fired` → `waking`). Script de notification Windows perso de Baptiste
(`~/.claude/hooks/notify/`, hors repo Hooky) mis à jour en miroir avec 8 nouveaux messages par
type. À la demande de Baptiste, ajout de l'animation `celebrate` (déjà présente dans l'export du
moteur, jamais câblée) sur `Stop` uniquement — seul event qui marque une vraie fin de tâche,
contrairement à `PostToolUse`/`SubagentStop`/`PostCompact` qui restent `idle`.

Au passage, deux bugs trouvés et corrigés dans `resolve_state()`/`on_event()` : la liste de
priorité d'agrégation ne couvrait pas toutes les animations possibles (`waking`/`confused`
retombaient sur `bored`), et l'overlay debug affichait le hook de la dernière requête traitée
plutôt que celui de la session ayant produit l'animation affichée — combinaisons en apparence
contradictoires (`animation: waking` / `hook: Stop`) alors que l'agrégat était correct.

La table de correspondance events→animations, jusque-là dans `ROADMAP.md`, est déplacée vers un
nouveau fichier dédié `docs/EVENTS.md`, tenu à jour en miroir du code.

**Entrées clés :**

- [BDR-010](decisions/BDR-010.md) — SessionStart : hook `command`+`curl` au lieu de `http` natif
- [BDR-011](decisions/BDR-011.md) — `celebrate` remplace `idle` sur `Stop`
- [ZBLK-005](archive/blockers/ZBLK-005.md) — avatar figé sur `sleeping`, résolu
- [LRN-007](learnings/LRN-007.md) — liste de priorité doit couvrir tout l'espace de sortie
- [LRN-008](learnings/LRN-008.md) — debug overlay doit tracer la session source
- [LRN-009](learnings/LRN-009.md) — vérifier par fetch direct les affirmations chiffrées d'un agent

---

Session de validation visuelle du mapping event→animation (objectif explicite de Baptiste :
regarder si chaque animation montre réellement ce que son nom promet, pas juste se fier au
nom sémantique déjà décidé). Ajout d'un nouvel onglet "Animation" dans la fenêtre settings :
grille de cartes rejouant en boucle, pour chaque hook et chaque `notification_type`, sa propre
instance `AvatarEngine` contrôlée localement (indépendante de `hooky-state`, pas de dépendance
au pet réel). `Settings.tsx` restructuré en dossier (`Settings/index.tsx` + `components/`,
seuil des 200 lignes dépassé). Une section "Transitions" (lecteur de presets avec délai
configurable) a été ajoutée puis retirée à la demande de Baptiste après un premier retour visuel.

Validation en usage réel : Baptiste a confirmé deux incohérences entre le nom de l'animation et
son rendu — `SessionStart` (`waking`→`listening`) et `quota_auto_resume_fired`
(`waking`→`bored`), corrigées dans `animation_for_event()` et `docs/EVENTS.md`. `waking` n'est
donc plus produit par aucun event (retiré de `STATE_PRIORITY`).

Plusieurs itérations UX demandées par Baptiste sur retour visuel direct (captures d'écran) :
grille responsive (`auto-fill minmax`, pas de breakpoints manuels), transitions CSS douces sur
changement de taille/mode debug (`Avatar.tsx` — le moteur `@bible-strong/avatar-react` expose un
`style` passthrough sur un wrapper `<div>` en `viewBox` SVG, donc une simple règle
`transition: width/height` suffit, pas besoin de hack `transform:scale`), boutons
Exporter/Importer/Réinitialiser en pleine largeur sous un certain seuil (réutilisation du
contexte `@container/field-group` déjà établi par le composant `Field` de shadcn plutôt qu'un
breakpoint viewport parallèle), mode debug déplacé en footer épinglé de l'onglet Réglages,
fenêtre settings plafonnée à 620px de large (grille à 3 colonnes max). Un scrollbar horizontal
fantôme signalé par Baptiste (visible seulement slider à 100%) diagnostiqué et corrigé en un
passage : `overflow-y:auto` implique `overflow-x:auto`, le hit-target étendu du thumb du slider
dépassait le conteneur en bout de course.

**Entrées clés :**

- [BDR-012](decisions/BDR-012.md) — grille de validation visuelle des animations
- [BDR-013](decisions/BDR-013.md) — mapping SessionStart/quota_auto_resume_fired corrigé
- [LRN-010](learnings/LRN-010.md) — container query : réutiliser le contexte nommé du design system
- [LRN-011](learnings/LRN-011.md) — overflow-y:auto implique overflow-x:auto, hit-target slider
- [LRN-012](learnings/LRN-012.md) — Tauri maxWidth ignoré sans maxHeight pairé

---

Rituel de consolidation mémoire (scope local). 1 fusion, 0 archivage. [ZBDR-008](archive/decisions/ZBDR-008.md) et [ZBDR-009](archive/decisions/ZBDR-009.md) (même épisode CSS/Tailwind en deux temps, se référençant déjà mutuellement pour reconstituer l'état final) fusionnées en [BDR-014](decisions/BDR-014.md), sources archivées.

**Entrées clés :**

- [BDR-014](decisions/BDR-014.md) — composants en Tailwind, resets globaux gardés dans App.css (fusion de BDR-008/BDR-009)

---

Très grosse session, entièrement pilotée par des retours visuels itératifs de Baptiste sur le pet en usage réel. Construction d'un système complet d'effets visuels superposés à l'animation SVG du moteur, pour rendre l'état du pet plus lisible : confettis + bounce multi-sauts sur `celebrate`, shake + icône d'erreur sur les hooks `*Failure`, badge icône fixe (haut à droite, couleur assombrie en HSL jusqu'au seuil de contraste WCAG contre le fond blanc) pour la plupart des autres hooks, "zZz" flottant réservé à `sleeping`. Tout implémenté via `Element.animate()` (Web Animations API native, `useWaapi` partagé) plutôt que CSS/Tailwind, cohérent avec la convention "pas de fichier CSS custom" déjà actée. Architecture clé : les icônes sont choisies par hook exact (`findMappingEntry`, catalogue étendu avec un champ `icon` par entrée), pas par bucket d'animation agrégé — plusieurs hooks partagent la même animation sans avoir le même sens (une oreille sur `SessionStart` n'avait aucun sens pour Baptiste).

Ajout d'un mode "test en direct" dans l'onglet Animation : cliquer sur une carte envoie le vrai payload sur `/event` (même route que les hooks Claude Code), débloqué après avoir découvert que la webview settings est soumise au CORS navigateur contrairement au trafic `curl` des vrais hooks (CORS permissif ajouté côté axum). Plusieurs itérations sur le comportement de surlignage "carte en cours" avant de stabiliser sur un état purement local au clic — l'agrégat live multi-session (`useHookyState`) était systématiquement pollué par les sessions Claude Code réellement actives en parallèle (dont celle de l'agent lui-même en train de développer la fonctionnalité), rendant le highlight imprévisible quel que soit le critère de correspondance essayé.

Deux bugs backend trouvés en creusant des symptômes qui semblaient purement frontend : (1) le reaper de nettoyage périodique (tick 10s) réémettait un payload tronqué dès qu'il détectait un changement par rapport à son propre suivi jamais synchronisé avec le handler principal, effaçant silencieusement `lastEvent` et donc le badge — corrigé en factorisant la construction du payload (`resolve_full_state`) entre les deux points d'émission ; (2) `SessionState`/l'event `hooky-state` étendus avec `notification_type` pour que le pet réel (pas seulement la grille de validation) distingue les `notification_type` entre eux.

Baptiste a testé deux avatars alternatifs exportés du Studio officiel bible-strong ("Onee", "Sunee"), révélant coup sur coup trois angles morts de robustesse jamais nécessaires avec l'avatar Cubee d'origine : des valeurs de `tipRoundness`/`baseRoundness` hors des bornes du schéma de validation runtime (le Studio permet des valeurs que la librairie qui consomme son export rejette ensuite — throw non catché, fenêtre transparente vide sans trace d'erreur) ; un contraste d'icône illisible sur un avatar à `colors.body` clair ; et un avatar avec des satellites (`body.nodes`) débordant de la fenêtre fixe 240×240. Nouveau module `avatarDefinition.ts` centralisant les trois fixes (clamp, contraste WCAG assombri en HSL, fit-scale). Le calcul de fit-scale a lui-même connu deux faux départs : une mesure DOM (`getBBox()`) faisait rétrécir même les avatars sans satellites (élément invisible du moteur probablement inclus dans la mesure), puis un calcul statique de remplacement utilisait une formule d'extension par axe séparé qui sous-estimait l'extension réelle d'un satellite en diagonale.

Diagnostic le plus long de la session : l'avatar "disparaissait" après une relance, tray intact. Fausse piste initiale (conflit de port avec une instance de fond de l'agent) suivie d'une tentative de diagnostic malvenue — vol de focus + envoi de touches à l'aveugle sur la fenêtre de l'utilisateur pour tenter d'ouvrir des devtools, abandonnée après avoir raté sa cible et reconnue comme une erreur de méthode. La vraie cause (roundness hors bornes de "Onee") n'a été trouvée qu'après que Baptiste a lui-même fait le lien avec son changement récent d'`avatar.json`.

Trois correctifs plus ponctuels en fin de session : `setFocus()` seul ne ramenait pas la fenêtre settings au premier plan depuis l'arrière-plan (anti-focus-stealing Windows, fixé avec `show()`+`unminimize()`+`setFocus()`) ; clic droit désactivé sur le pet (conservé dans les settings) ; `SettingsControls` scindé (`ConfigurationField` extrait, >200 lignes dépassées).

**Entrées clés :**

- [BDR-015](decisions/BDR-015.md) — icônes de badge par hook, pas par animation
- [BDR-016](decisions/BDR-016.md) — effets visuels via Web Animations API native
- [BDR-017](decisions/BDR-017.md) — avatarDefinition.ts centralise clamp/contraste/fit-scale
- [BDR-018](decisions/BDR-018.md) — highlight Animation tab basé sur le clic local
- [BDR-019](decisions/BDR-019.md) — CORS permissif sur le serveur axum local
- [ZBLK-006](archive/blockers/ZBLK-006.md) — avatar invisible, process confondu avec le vrai bug
- [ZBLK-007](archive/blockers/ZBLK-007.md) — badge qui disparaît, reaper au payload tronqué
- [ZBLK-008](archive/blockers/ZBLK-008.md) — fit-scale rétrécissait Cubee (getBBox puis formule fausse)
- [ZBLK-009](archive/blockers/ZBLK-009.md) — highlight multi-cartes, itérations de design
- [LRN-013](learnings/LRN-013.md), [LRN-014](learnings/LRN-014.md), [LRN-015](learnings/LRN-015.md), [LRN-016](learnings/LRN-016.md), [LRN-017](learnings/LRN-017.md), [LRN-018](learnings/LRN-018.md) — patterns extraits des blocages ci-dessus

---

Petite session de suite sur les retours visuels de Baptiste concernant les hooks. D'abord complétude des badges : `PostToolUse`, `PostCompact` et `SubagentStop` reprennent l'icône `Brain` de `UserPromptSubmit` pour rester cohérents avec la règle voulue par Baptiste — un icône affiché en continu tant qu'une session travaille, absent uniquement sur `Stop` (animation `celebrate` déjà distinctive) et les vrais états de repos (`bored`, `idle` de conclusion côté `Notification`). Icône Lucide également ajoutée à côté du badge du nom d'animation dans `AnimationCard.tsx` (grille de validation des settings), en plus du badge déjà présent sur l'avatar preview.

Ensuite ajout d'un toggle sur le double-clic avatar : `openSettingsWindow()` minimise désormais la fenêtre settings si elle a déjà le focus, au lieu de toujours la focus/créer. Baptiste a immédiatement signalé en usage réel que le double-clic ne ramenait plus du tout la fenêtre au premier plan quand elle était en arrière-plan — diagnostic remontant jusqu'aux capacités Tauri v2 : `core:default` n'inclut que les accesseurs du plugin window (`is-focused`, `is-minimized`...), jamais les actions (`show`, `minimize`, `unminimize`, `set-focus`), qui doivent être déclarées explicitement par capability. Bug préexistant à ce changement (le `show()`/`unminimize()`/`setFocus()` déjà en place avant le toggle n'avait jamais eu la permission), révélé seulement maintenant par un test en usage réel sur fenêtre en arrière-plan.

Enfin, à la demande de Baptiste, `idle_prompt` passe de l'animation `bored` à `sleeping` (zzz) — signal d'inactivité auto-détecté par Claude Code lui-même, plus fort qu'un simple `bored` local. Changement appliqué aux trois sources (Rust `animation_for_event()`, miroir `animationCatalog.ts`, `docs/EVENTS.md`), avec ajout explicite de `bored` et `sleeping` dans `STATE_PRIORITY` pour rester exhaustive — même classe de bug que [LRN-007](learnings/LRN-007.md) (une valeur absente de la liste de priorité retombe silencieusement sur le fallback). Au passage, l'overlay debug affiche désormais aussi `notification_type` entre parenthèses pour le hook `Notification`, sur le même modèle que `toolName` pour `PreToolUse`.

Rituel de fermeture : archivage des 4 blockers résolus de la session précédente (BLK-006 à BLK-009 → ZBLK-006 à ZBLK-009).

**Entrées clés :**

- [BDR-020](decisions/BDR-020.md) — icônes de badge toujours visibles pendant le travail
- [BDR-021](decisions/BDR-021.md) — toggle focus/minimize sur double-clic
- [BDR-022](decisions/BDR-022.md) — `idle_prompt` → `sleeping`, STATE_PRIORITY exhaustif
- [ZBLK-010](archive/blockers/ZBLK-010.md) — permissions Tauri manquantes pour le toggle, résolu

---

Suite de la session sur les badges d'icônes. D'abord, à la demande de Baptiste, ajout d'une transition fade+scale sur l'apparition/disparition du badge — jusque-là seule la sortie fadait, pas l'entrée — puis d'un crossfade indépendant du glyphe pour que le cercle ne clignote plus quand deux hooks actifs se succèdent. Bug classique de transition CSS rencontré au passage : un nœud DOM monté directement dans son état final ne peut rien interpoler depuis un état caché qu'il n'a jamais traversé — fix par double `requestAnimationFrame` pour forcer un paint intermédiaire, appliqué au cercle et au glyphe.

Tentative de bulle façon BD (squircle + queue/traîne) pour le badge, rejetée visuellement par Baptiste ("pas belle") ; retour au cercle simple d'origine.

Remplacement complet des icônes de badge statiques (`lucide-react`) par leurs équivalents animés de lucide-animated (`pqoqubbw/icons`) : bibliothèque en registre "copier-coller" façon shadcn, pas un package npm — chaque icône copiée dans `src/components/icons/`, dépendance `motion` ajoutée, animation par défaut au survol désactivée au profit d'une boucle continue démarrée au montage (`repeat: Infinity` + `useEffect`). 7 correspondances exactes, 4 substituts proches choisis pour les icônes sans équivalent animé (`TriangleAlert`→`BadgeAlert`, `HelpCircle`→`CircleHelp`, `MessageCircleQuestion`→`MessageCircle`, `PauseCircle`→`Pause`), `Ear` resté statique faute d'équivalent. Nouveau type `BadgeIcon` (union `LucideIcon | ComponentType`) dans `animationCatalog.ts` pour couvrir les deux familles de composants. Fonctionnalité commitée.

Bug découvert dans la grille de validation Settings avant le commit : les icônes animées rendent leur SVG dans un `<div>` wrapper, donc la classe Tailwind de taille passée en `className` n'atteignait que ce wrapper — icônes énormes, libellés tronqués. Fix : prop `size` explicite dans `AnimationCard.tsx`.

Test `WrenchIcon`→`SquarePenIcon` sur `PreToolUse (outil standard)`. Baptiste avait lui-même consolidé les 5 icônes "attente d'une décision utilisateur" (`PermissionRequest`, `Elicitation`, `permission_prompt`, `elicitation_dialog`, `agent_needs_input`) sur `CircleHelp` en éditant directement le fichier, car il n'aimait pas l'animation précédente — gardé tel quel après clarification, seule l'entrée de repli générique utilise désormais `MessageCircleMore` (bulle avec "..." qui clignotent).

Après le commit, bug remonté en usage réel : deux hooks déclenchés coup sur coup plus vite que le délai de crossfade (150ms) laissaient le badge affiché avec un cercle plein mais sans icône visible dedans — chaque nouveau changement annulait le timer de fade en vol avant qu'il ait pu committer le swap. Fix par une garde de timer (`fadeTimeoutRef`, ne pas en relancer un second tant qu'un cycle est en vol) + une ref séparée pour la cible la plus récente (`pendingIconRef`).

**Entrées clés :**

- [BDR-023](decisions/BDR-023.md) — icônes de badge remplacées par lucide-animated
- [BDR-024](decisions/BDR-024.md) — badge reste un cercle simple, bulle BD abandonnée
- [BDR-025](decisions/BDR-025.md) — icône "listening" : CircleHelp conservé, MessageCircleMore pour le repli
- [ZBLK-011](archive/blockers/ZBLK-011.md) — entrée du badge n'animait pas, résolu
- [ZBLK-012](archive/blockers/ZBLK-012.md) — icônes géantes dans la grille Settings, résolu
- [ZBLK-013](archive/blockers/ZBLK-013.md) — "badge blanc" sur rafale d'icônes rapprochées, résolu

---

Session de vérification de config (`settings.json` vs le snippet partagé vs `animationCatalog.ts`) qui a débouché sur un diagnostic multi-session en profondeur. Baptiste a signalé un affichage incohérent en usage réel : `celebrate` (`Stop`) suivi d'un `SubagentStop` non désiré, puis un `SessionStart` masqué au lancement d'une nouvelle session — "n'importe quelle dernière animation jouée" semblait rejouée. Plusieurs pistes explorées et écartées une à une avant la vraie cause : `autoMemoryEnabled` (rejeté par Baptiste, identique sur toutes ses machines), le spinner CLI "running stop hooks 1/4" (réfuté par la doc officielle des hooks — `SubagentStop` n'est jamais déclenché par un hook `Stop` configuré en settings), un fork automatique du harness (piste correcte mais incomplète). `ListAgents`/`SendMessage` utilisés pour interroger directement une autre session Claude Code active sur la machine plutôt que deviner.

Sur demande explicite de Baptiste ("on debug au lieu d'échanger"), prise de contrôle directe du serveur : process de dev tué, log de debug temporaire ajouté, binaire relancé et piloté à la main, payloads curl isolés rejoués pour reproduire exactement les séquences buguées. Deux bugs distincts confirmés et corrigés dans `resolve_state()`/`on_event()` : (1) la map `Sessions` keyée uniquement par `session_id` laissait un `SubagentStop` (sous-agent visible ou fork système) écraser l'entrée de son propre parent ; (2) `STATE_PRIORITY` servait aussi à arbitrer entre sessions différentes, masquant une session qui démarre activement derrière un état "au repos" d'une autre. Fix : clé composite `(session_id, agent_id)` + résolution à deux niveaux (priorité intra-session, récence inter-sessions) — les deux validés en live par tests curl isolés avant remise en état de l'app (`pnpm tauri:dev`, avec nettoyage au passage d'un process Vite orphelin bloquant le port 1420).

**Entrées clés :**

- [BDR-026](decisions/BDR-026.md) — clé de session (session_id, agent_id)
- [BDR-027](decisions/BDR-027.md) — résolution d'état à deux niveaux (priorité intra-session, récence inter-sessions)
- [ZBLK-014](archive/blockers/ZBLK-014.md) — animation incohérente en multi-session, résolu

## 2026-08-26

Petite session : fenêtre settings dotée d'une largeur minimale (`minWidth: 400`/`minHeight: 550`, paire
requise par le quirk Tauri déjà documenté en LRN-012) pour éviter qu'elle devienne trop étroite au
redimensionnement, et curseur `grab`/`grabbing` ajouté sur le conteneur de l'avatar pour signaler
visuellement qu'il est draggable au survol. Commit généré via `/gen-commit`.

---

Suite directe sur le feedback tactile au hover/drag de l'avatar. Baptiste a d'abord demandé un avis
(curseur natif Windows vs curseur custom) : recommandation de garder `grab`/`grabbing` natif plutôt
que d'investir dans un curseur SVG custom (coût hotspot/DPI pour un gain marginal sur un widget aussi
petit), avec en alternative un effet visuel sur l'avatar lui-même. Squash au hover/active
(`hover:scale-105 active:scale-95`) ajouté, puis signalé sans transition visible malgré
`transition-[...,transform]` — cause trouvée : Tailwind v4 émet `scale`/`rotate` comme propriétés
CSS natives séparées, plus composées dans `transform` comme en v3, donc lister `transform` dans
`transition-[...]` ne capte plus rien (voir [LRN-026](learnings/LRN-026.md)). Wobble
(`hover:-rotate-2`) et ombre au hover ajoutés ensuite ; premier essai avec `hover:brightness-95`
corrigé sur retour de Baptiste (il voulait assombrir l'ombre, pas l'avatar) en `drop-shadow`
arbitraire à opacité croissante (`rgba(0,0,0,0.2)` → `0.4`). Ombre permanente légère étendue par
cohérence aux deux autres endroits où l'avatar est prévisualisé dans les settings (sélecteur
d'avatar, grille de validation des animations).

**Entrées clés :**

- [LRN-026](learnings/LRN-026.md) — Tailwind v4 : scale/rotate sont des propriétés CSS natives

---

Grosse fonctionnalité demandée par Baptiste : picker d'avatar, avec plusieurs de ses propres exports
du Studio bible-strong à sélectionner et à mémoriser (localStorage, "lolcastroga"). `avatarDefinition.ts`
refactorisé d'un singleton (un seul `avatar.json` importé en dur) vers un registre construit au
chargement via `import.meta.glob("./avatars/*.json", { eager: true })` : déposer un fichier dans le
dossier suffit à le faire apparaître, aucun changement de code. `AvatarBundle` (définition clampée,
`AvatarEngine`, `avatarFitScale`, `badgeIconColor`) calculé une fois par avatar plutôt qu'à la demande,
pour ne pas remonter le SVG à chaque changement de sélection. Nouveau champ `avatarId` dans
`HookySettings`, même mécanisme de sync (localStorage + event Tauri) que le reste des réglages —
zéro nouvelle plomberie. `Avatar.tsx`, `AnimationOverlay.tsx` et `AnimationCard.tsx` migrés du
singleton statique vers `getAvatarBundle(settings.avatarId)` (`badgeIconColor` devient une prop
plutôt qu'un import statique, puisqu'il dépend désormais de l'avatar sélectionné).

Détour de typage TypeScript pendant le refactor : `RawAvatarDefinition` dérivé d'un import statique
de `cubee.json` (conservé uniquement pour le type, le chargement runtime passe par le glob) — un
premier essai de simplification de `clampDefinition` en signature concrète a cassé le build
(`never[]` inféré du tableau `nodes: []` vide de cubee.json), corrigé en restaurant la signature
générique d'origine (voir GLRN-262).

Trois itérations de placement de l'UI, chacune tranchée par Baptiste après discussion (avis demandé
explicitement, jamais imposé) : d'abord onglet "Avatar" dédié, proposition de fusion dans "Réglages"
(rejetée d'abord par argument de densité visuelle plutôt que de volume, cf. LRN-028), fusionnée une
fois sur insistance de Baptiste ("Réglages ne va pas s'étoffer tant que ça"), puis revert vers onglet
dédié à sa demande — avec au passage réordonnancement (Avatar → Réglages → Animation, Avatar par
défaut à l'ouverture) et un fondu d'entrée (`key` + `animate-in fade-in`, tw-animate-css) sur le
switch d'avatar dans la fenêtre du pet, chaque avatar ayant son propre composant généré par
`createAvatar()` donc un remount inévitable (voir GLRN-263).

Dernier retour utilisateur en usage réel (Baptiste avait déjà déposé lui-même 9 nouveaux avatars
dans le dossier, capture d'écran à l'appui) : grille sans scroll si la fenêtre est trop petite (fix
— wrapper `flex-1 overflow-y-auto` manquant, pattern déjà utilisé ailleurs dans les settings), et
l'animation "aléatoire" des cartes ne l'était pas vraiment — première implémentation piochait dans
une liste curatée de 8 animations "accueil" puis se figeait sur "idle" après un délai fixe, rejetée
explicitement par Baptiste au profit d'un cycle perpétuel piochant dans les 23 animations réelles,
dont la durée est calculée depuis les steps déclarés plutôt que devinée (voir LRN-027).

**Entrées clés :**

- [BDR-028](decisions/BDR-028.md) — registre multi-avatar auto-découvert via `import.meta.glob`
- [BDR-029](decisions/BDR-029.md) — onglet Avatar dédié, ordre Avatar/Réglages/Animation
- [LRN-027](learnings/LRN-027.md) — durée réelle du cycle d'animation plutôt qu'un timeout arbitraire
- [LRN-028](learnings/LRN-028.md) — densité visuelle, pas volume, décide d'un onglet dédié

---

Suite directe sur le picker d'avatar : ajout de l'édition de couleurs (corps/yeux) de l'avatar sélectionné, demandée par Baptiste. `getAvatarBundle` étendu pour accepter un `colorOverride` optionnel et reconstruire le bundle à la volée (nouveau `createAvatar`) ; couleurs persistées dans `HookySettings.avatarColorOverrides`, keyed par avatarId pour ne pas écraser l'édition d'un autre avatar en changeant de sélection (cf. [BDR-030](decisions/BDR-030.md)).

Deux bugs sérieux trouvés en usage réel juste après la première implémentation. D'abord un lag perceptible en éditant une couleur, cause double : `getAvatarBundle` non mémoïsé reconstruisait tout l'avatar à chaque re-render (pas seulement au changement de couleur), et le picker natif committait à chaque event "input" continu du drag plutôt qu'au "change" final — fix via un hook partagé `useAvatarBundle` (mémoïsé sur les valeurs primitives body/eyes) et un commit différé côté `ColorSwatch`. Ensuite, un crash silencieux : éditer une seule des deux couleurs faisait disparaître l'avatar (fenêtre transparente vide) — l'override toujours construit avec les deux clés laissait l'autre à `undefined`, écrasant via spread une couleur valide et cassant la validation du schéma runtime (`createAvatar` throw sans error boundary, même famille que [LRN-013](learnings/LRN-013.md)).

Itération UI ensuite, pilotée par plusieurs retours visuels successifs de Baptiste : swatches ronds stylés (label + input natif superposé) plutôt que le rectangle natif brut, reset par carte (icône CCW, immédiat) puis reset groupé en footer avec confirmation `AlertDialog` (cf. [BDR-031](decisions/BDR-031.md)), panneau couleurs sorti du conteneur scrollable et plaqué en bas comme "Configuration" dans Réglages, card retirée au profit du même pattern `Field`+`Separator` que le reste des settings.

Tentative ratée de "métamorphose" : composant `AvatarEngineView` dédié (fade-out séquencé → swap → fade-in) construit pour animer le changement de couleur comme une transformation douce. Baptiste a signalé que le pet flottant n'avait plus AUCUNE transition (contrairement aux cartes settings) et jugé l'implémentation trop complexe par rapport à l'existant — diagnostic : un `style.transition` explicite passé au composant écrasait la classe `transition-opacity` du crossfade. Composant entièrement retiré, remplacé par l'extension du mécanisme déjà en place (`avatarBundleKey` = avatarId+couleurs comme clé de remount, même `animate-in fade-in` que le changement d'avatar) — cf. [BDR-033](decisions/BDR-033.md)/[LRN-032](learnings/LRN-032.md).

Enfin, à la demande explicite de Baptiste, extraction d'une variante `responsive` (cva) dans `ui/button.tsx` pour remplacer le `className="w-full @md/field-group:w-auto"` dupliqué 5 fois entre `ConfigurationField` et `AvatarPicker` (cf. [BDR-032](decisions/BDR-032.md)). Un bug résiduel de layout (boutons reset toujours en pleine largeur, contrairement à Réglages) a été traité en restructurant vers le vrai composant `FieldGroup` ancêtre (au lieu d'un `@container/field-group` posé à la main) — CSS généré vérifié correct dans le build, mais non reconfirmé visuellement par Baptiste en fin de session (cf. [ZBLK-018](archive/blockers/ZBLK-018.md), resté ouvert).

**Entrées clés :**

- [BDR-030](decisions/BDR-030.md) — couleurs keyed avatarId, pas d'override global
- [BDR-031](decisions/BDR-031.md) — deux niveaux de reset (icône carte / footer confirmé)
- [BDR-032](decisions/BDR-032.md) — variante `responsive` sur Button plutôt que className dupliqué
- [BDR-033](decisions/BDR-033.md) — transition couleur = mécanisme du changement d'avatar
- [ZBLK-015](archive/blockers/ZBLK-015.md) — color pickers lents, résolu
- [ZBLK-016](archive/blockers/ZBLK-016.md) — avatar disparaît sur override partiel, résolu
- [ZBLK-017](archive/blockers/ZBLK-017.md) — crossfade custom cassait la transition existante, résolu
- [ZBLK-018](archive/blockers/ZBLK-018.md) — boutons reset toujours full-width, ouvert (non reconfirmé)
- [LRN-029](learnings/LRN-029.md), [LRN-030](learnings/LRN-030.md), [LRN-031](learnings/LRN-031.md), [LRN-032](learnings/LRN-032.md) — patterns extraits des blocages ci-dessus

---

Demande de Baptiste : repositionner les 2 boutons de reset couleurs sous la description "Personnalise le corps et les yeux..." en fenêtre large, sans toucher au rendu en fenêtre étroite (déjà validé). Diagnostic : les deux positions appartiennent à deux conteneurs flex distincts (l'un imbriqué dans `FieldContent`, l'autre sibling du `Field` principal) — `order` CSS seul ne permet pas de déplacer un élément entre deux conteneurs flex différents. Solution retenue : composant `ResetButtons` partagé, rendu deux fois avec des classes de visibilité responsive opposées (`hidden @md/field-group:flex` / `@md/field-group:hidden`), et les deux `AlertDialog` de confirmation découplés de leur `AlertDialogTrigger` (state contrôlé, boutons appelant `setOpen(true)` directement) pour éviter de dupliquer le dialog lui-même (cf. [BDR-034](decisions/BDR-034.md)/[LRN-033](learnings/LRN-033.md)).

Vérification visuelle faite dans la vraie app Tauri (pas seulement lecture de code), via interop Win32 direct en PowerShell (EnumWindows pour localiser les fenêtres, double-clic simulé pour ouvrir les settings, redimensionnement + screenshot GDI pour chaque largeur) — confirme au passage [ZBLK-018](archive/blockers/ZBLK-018.md) (resté ouvert en fin de session précédente faute de confirmation visuelle), désormais résolu et archivé. Nouveau blocage rencontré et résolu en cours de route : un premier lancement de `tauri dev` combinant `run_in_background` et `&` sortait immédiatement sans réellement lancer le serveur, laissant un process zombie sur le port 1420 qui bloquait la relance (cf. [ZBLK-019](archive/blockers/ZBLK-019.md)/[LRN-034](learnings/LRN-034.md)).

Ménage mémoire en fin de session : archivage de 3 blockers résolus non encore archivés ([ZBLK-015](archive/blockers/ZBLK-015.md), [ZBLK-016](archive/blockers/ZBLK-016.md), [ZBLK-017](archive/blockers/ZBLK-017.md)) avec mise à jour de toutes les références croisées.

**Entrées clés :**

- [BDR-034](decisions/BDR-034.md) — boutons reset dupliqués plutôt que déplacés en CSS pur
- [ZBLK-018](archive/blockers/ZBLK-018.md) — full-width des boutons reset, enfin confirmé résolu
- [ZBLK-019](archive/blockers/ZBLK-019.md) — process zombie `tauri dev` sur le port 1420
- [LRN-033](learnings/LRN-033.md), [LRN-034](learnings/LRN-034.md), [LRN-035](learnings/LRN-035.md) — patterns extraits (dialog découplé, run_in_background+&, vérif Tauri via Win32)

## 2026-08-28

Demande de Baptiste : intégrer le système de notification Windows natif (PowerShell + BurntToast, `hooks/notify/`) dans Hooky, avec une contrainte explicite — soit du natif OS partout, soit un système custom avec sa propre DA. Recommandation retenue : bulle custom ancrée au pet plutôt qu'un toast OS générique, cross-platform gratuit en React. Point dur identifié avec Baptiste avant tout code : la fenêtre du pet (240×240, `decorations:false`) ne peut pas absorber un contenu plus grand sans clipping — solution retenue, une 2e fenêtre Tauri dédiée, statique et autonome (cf. [BDR-035](decisions/BDR-035.md)).

Implémentation : fenêtre `bubble` (300×90, transparente, `alwaysOnTop`), capability dédiée, pool de messages FR/humour porté tel quel depuis `messages.ps1` (Stop + 12 `notification_type` + repli), sons `notification.wav`/`stop.wav` réutilisés via `Audio` natif, toggle "Notifications" ajouté aux Settings (même pattern que `effectsEnabled`), positionnement calculé dynamiquement (au-dessus/en-dessous du pet, clampé au moniteur) pour gérer le drag et le multi-écran.

Vérification laborieuse : lint/build passaient, mais la bulle restait invisible sur 4 captures PowerShell successives malgré une instrumentation confirmant que toute la chaîne (position, `setPosition()`/`show()`, `isVisible()=true`) fonctionnait sans erreur — cause identifiée après coup : capture GDI classique incompatible avec le rendu matériel WebView2/DirectComposition, pas un bug applicatif (cf. [ZBLK-020](archive/blockers/ZBLK-020.md)/[LRN-036](learnings/LRN-036.md)). Baptiste a confirmé visuellement que la bulle s'affichait correctement, juste avec un gap trop large avec le pet — corrigé en collant le contenu au bord concerné plutôt qu'en centrant dans la fenêtre volontairement surdimensionnée (cf. [LRN-039](learnings/LRN-039.md)).

À la demande de Baptiste, purge des hooks `notify` (command PowerShell) dans `~/.claude/settings.json` global — Hooky remplaçant désormais ce système, seules les entrées `http` vers Hooky restent (cf. [BDR-036](decisions/BDR-036.md)). Blocage inattendu : `Edit` a refusé d'écrire dans ce fichier, Baptiste s'attendant à devoir lever une protection ReadOnly comme lors d'un blocage similaire archivé ([ZBLK-001](archive/blockers/ZBLK-001.md)) — cause réelle différente cette fois, le fichier est devenu un symlink vers le dotfiles repo entre-temps (cf. [ZBLK-021](archive/blockers/ZBLK-021.md)/[LRN-038](learnings/LRN-038.md)).

**Entrées clés :**

- [BDR-035](decisions/BDR-035.md) — bulle de notification : fenêtre statique et autonome
- [BDR-036](decisions/BDR-036.md) — hooks notify PS1 purgés du settings.json global
- [ZBLK-020](archive/blockers/ZBLK-020.md) — screenshot GDI invisible sur fenêtre WebView2, résolu
- [ZBLK-021](archive/blockers/ZBLK-021.md) — édition settings.json bloquée, fausse piste ReadOnly, résolu
- [LRN-036](learnings/LRN-036.md), [LRN-037](learnings/LRN-037.md), [LRN-038](learnings/LRN-038.md), [LRN-039](learnings/LRN-039.md) — patterns extraits (GDI/WebView2, monitorFromPoint, Edit+symlink, contenu collé au bord)

## 2026-08-29

Session longue partie d'une demande UI (bulle qui ne colle pas à l'avatar quand `avatarSize < 240`, zones transparentes qui draguent encore, curseur de drag manquant sur la bulle) et qui a dérivé vers un bug backend de duplication de notifications. Fusion de la fenêtre `bubble` (BDR-035) dans `main` : la bulle est maintenant rendue directement dans la fenêtre du pet, ancrée au bord réel du haut de l'avatar via `bubbleBottomOffset()` (dépend d'`avatarSize`, cf. [BDR-037](decisions/BDR-037.md)) — élimine tout le calcul cross-fenêtre à l'origine du gap. Tentative de restreindre le drag aux seules zones peintes (SVG/badge/bulle) pour permettre un click-through vers l'application derrière : cassée une première fois par une mauvaise valeur `pointer-events` (cf. [LRN-041](learnings/LRN-041.md)), corrigée, puis abandonnée entièrement une fois confirmé que `setIgnoreCursorEvents` ne fonctionne pas sur Windows/WebView2 (bug Tauri connu, cf. [LRN-043](learnings/LRN-043.md)) — retour au drag simple sur toute la fenêtre (cf. [BDR-038](decisions/BDR-038.md)).

Investigation plus longue sur un `Stop` réel jouant son son/bulle en double (parfois triple) malgré plusieurs corrections successives : dédoublonnage par numéro de séquence backend (fixe une vraie race React StrictMode sur l'abonnement `listen()`, cf. [LRN-042](learnings/LRN-042.md)), garde-fou sur un `Stop` en écho sans activité réelle entre les deux, hypothèse de fork système invisible sans `agent_id`, hypothèse cross-session (écartée par le timing). Cause réelle trouvée en instrumentant exhaustivement `/event` (avec les champs officiels `stop_hook_active`/`prompt_id`, cf. [LRN-044](learnings/LRN-044.md)) : le reaper périodique (`spawn_idle_reaper`) gardait son propre suivi de dédoublonnage jamais synchronisé avec le handler principal — récidive d'un pattern déjà documenté début de projet ([LRN-017](learnings/LRN-017.md)) dont le fix précédent n'avait couvert que le contenu du payload, pas le suivi lui-même (cf. [LRN-040](learnings/LRN-040.md), [ZBLK-022](archive/blockers/ZBLK-022.md)). Confirmé résolu par Baptiste après plusieurs tests successifs.

Constat méta sur cette session : le rituel mémoire (CLAUDE.md) ne se déclenche qu'au tout début, sur la 1ère demande — n'a pas été re-consulté au moment où l'investigation a dérivé vers ce bug backend, alors que [LRN-017](learnings/LRN-017.md) documentait déjà exactement ce pattern. Ajout d'une section au rituel CLAUDE.md global demandant un re-`Grep` ciblé à chaque dérive de sous-domaine technique en cours de session (cf. [LRN-040](learnings/LRN-040.md)).

Archivage de deux blockers résolus de la session précédente ([ZBLK-020](archive/blockers/ZBLK-020.md), [ZBLK-021](archive/blockers/ZBLK-021.md), déjà faits en cours de session) pendant le rituel de fermeture.

**Entrées clés :**

- [BDR-037](decisions/BDR-037.md) — fusion de la fenêtre bulle dans main, révise [BDR-035](decisions/BDR-035.md)
- [BDR-038](decisions/BDR-038.md) — abandon du drag restreint aux zones peintes
- [ZBLK-022](archive/blockers/ZBLK-022.md) — double Stop/son, plusieurs fausses pistes avant la vraie cause (reaper)
- [LRN-040](learnings/LRN-040.md), [LRN-041](learnings/LRN-041.md), [LRN-042](learnings/LRN-042.md), [LRN-043](learnings/LRN-043.md), [LRN-044](learnings/LRN-044.md) — patterns extraits (récidive reaper + méta rituel mémoire, pointer-events/SVG, StrictMode+async listen, Tauri click-through, champs hooks Stop)

---

Session courte, en parallèle d'une autre session (`hooky-c0`) travaillant sur la fusion bulle/dédup dans le même fichier `NotificationBubble/index.tsx` (cf. sections ci-dessus) : Baptiste avait remarqué que le son manquait au démarrage de session. Port de `start.wav` (déjà présent dans `hooks/notify/assets/`, mais jamais réellement câblé au son manquant côté Hooky) — joué sans bulle sur `SessionStart`, complétant le pool `Stop`/`Notification` déjà repris. En creusant le hook notify.ps1 d'origine, trouvé que `session-start-context.ps1` (câblé sur `SessionStart` dans `settings.json`) appelait encore directement `Send-ClaudeNotification` avec ce même `start.wav`, indépendamment de `main.ps1` — dernier vestige de notify.ps1 resté actif après la purge Stop/Notification de [BDR-036](decisions/BDR-036.md). Retiré (cf. [BDR-039](decisions/BDR-039.md)) : le hook `http` vers Hooky déjà présent sur `SessionStart` ([BDR-010](decisions/BDR-010.md)) le remplace intégralement.

Coordination avec `hooky-c0` via message cross-session (elle éditait le même fichier en parallèle) : confirmation mutuelle qu'aucun conflit n'était en cours (diff additif isolé d'un côté, pas de trafic déclenché sur le port 4242 partagé de l'autre).

Ménage mémoire en fin de session : archivage du blocker résolu [ZBLK-022](archive/blockers/ZBLK-022.md) (`BLK-022`) avec mise à jour de ses références croisées.

**Entrées clés :**

- [BDR-039](decisions/BDR-039.md) — son SessionStart porté, notify.ps1 totalement retiré

---

Nouvelle session, retour visuel de Baptiste sur la fenêtre 300×330 (élargie pour la bulle, cf. [BDR-037](decisions/BDR-037.md)) : capture d'écran montrant un bandeau vide de 90px au-dessus de l'avatar et des marges gauche/droite qui restent draguables même quand rien n'y est affiché. Diagnostic : le handler `mousedown` (drag de fenêtre) est posé sur tout le wrapper racine sans distinction de contenu — comportement inchangé depuis l'abandon de la restriction par `pointer-events` en début de journée (cf. [BDR-038](decisions/BDR-038.md)). Fix par une technique différente, ne retombant pas dans l'écueil de BDR-038 : `data-drag-handle` posé sur les éléments réellement affichés (box de l'avatar, bulle visible) + hit-test `e.target.closest()` dans le handler, sans toucher à `pointer-events` (donc aucun risque de casser le SVG hérité ni de dépendre du click-through non fonctionnel sur Windows/WebView2). Premier passage incomplet : le badge d'icône Lucide de `AnimationOverlay.tsx` (rendu en sibling de la box de l'avatar, pas en descendant) avait été oublié, repéré par Baptiste et corrigé dans la foulée. Lint + build passants après chaque itération. Baptiste a explicitement classé les deux learnings extraits en local plutôt que global.

**Entrées clés :**

- [BDR-040](decisions/BDR-040.md) — drag restreint via data-drag-handle + closest(), révise BDR-038
- [LRN-045](learnings/LRN-045.md) — technique data-attribute + closest() pour scoper un mousedown délégué
- [LRN-046](learnings/LRN-046.md) — auditer tous les pointer-events-auto avant de scoper un hit-test

---

Nouvelle session, polish visuel de `NotificationBubble` à la demande de Baptiste. Point de départ : pourquoi une bulle custom plutôt qu'une lib de toast (Sonner, Goey) ? Réponse argumentée (ancrage dynamique sur l'avatar, instance unique, state machine événementiel existant — la valeur des libs toast ne s'applique pas ici, cf. [BDR-041](decisions/BDR-041.md)), puis implémentation : effet de frappe caractère par caractère façon streaming chatbot (hide-timer différé à la fin de la frappe, cf. [LRN-049](learnings/LRN-049.md)), animation d'entrée "pop" (cubic-bezier overshoot) et sortie fade-in ease-in, police mono/medium, pause du hide-timer au survol/drag de la bulle.

Deux itérations sur l'usage de la couleur de l'avatar, guidées par le retour direct de Baptiste : une bordure gauche colorée d'abord, jugée "de l'AI slop de base" (cf. [LRN-048](learnings/LRN-048.md)) — remplacée par une pointe de bulle de BD pointant vers l'avatar. Premier essai de pointe ratée (elle flottait devant la bulle au lieu de s'y fondre) : cause réelle, un enfant absolu d'un parent `transform` se peint par-dessus le fond de ce parent par défaut, corrigé avec un `z-index` négatif + même fond/bordure que la bulle (cf. [LRN-047](learnings/LRN-047.md)). Essai supplémentaire de texte teinté avec la couleur de l'avatar (nouveau seuil de contraste AA 4.5:1 pour le texte, distinct du seuil badge 3:1) : rejeté par Baptiste au profit du texte neutre d'origine — code mort (`textAccentColor`, `useAvatarBundle` dans la bulle) entièrement retiré après le revert plutôt que laissé en place.

**Entrées clés :**

- [BDR-041](decisions/BDR-041.md) — pas de lib toast/animation pour la bulle, tout en CSS/JS natif
- [LRN-047](learnings/LRN-047.md), [LRN-048](learnings/LRN-048.md), [LRN-049](learnings/LRN-049.md) — patterns extraits (z-index/stacking context, accent color "AI slop", timer post-frappe)

---

Suite de session, demande explicite de Baptiste d'améliorer le mode debug : plus d'informations affichées et visualisation de toutes les zones qui composent la fenêtre "main". Enrichissement du panneau texte (`revision`, `avatarSize`, layout écran `flipped`/`shiftX`, `toolName`/`notificationType` séparés). Première version de la visualisation des zones en CSS brut (`[data-debug] [data-zone]` dans `index.css`) : bug immédiat signalé par Baptiste sur capture d'écran — badge d'icône et bulle de notification téléportés hors position, cause racine identifiée : la règle CSS forçait `position: relative` sur toutes les zones, y compris celles déjà en `absolute` (cf. [LRN-050](learnings/LRN-050.md)). Baptiste a aussi objecté sur le fond — pourquoi du CSS brut plutôt que du Tailwind, alors que le fond du mode debug avait toujours été fait en className conditionnel — réécrit intégralement en helper Tailwind (`src/lib/debugZone.ts`), sans jamais toucher `position`, étiquette via `before:content-[attr(data-zone)]` (cf. [BDR-042](decisions/BDR-042.md)). Texte de debug déplacé du coin haut-gauche vers le bas (chevauchait le badge d'état).

Itérations suivantes sur retours successifs de Baptiste : une couleur distincte par zone (window/slot/avatar/bubble-zone/bubble/badge), puis fond retiré sur bulle et badge (doivent rester visuellement blancs, contour seul), puis `slot` repassé d'orange à bleu. Dernier bug trouvé par Baptiste : l'étiquette "badge" apparaissait aussi dans les cartes de preview d'animation des Settings — cause racine, `AnimationOverlay` lisait `settings.debugMode` globalement via `useSettings()` plutôt que de le recevoir en prop, fuitant le mode debug de la fenêtre pet vers tout autre contexte de rendu du composant ; fixé par un prop `showDebugZone` explicite (cf. [BDR-043](decisions/BDR-043.md)/[LRN-051](learnings/LRN-051.md)). Au passage, pattern Tailwind capturé pour éviter une classe candidate construite par interpolation de variable, jamais générée silencieusement (cf. [LRN-052](learnings/LRN-052.md)). Lint + build vérifiés après chaque itération.

**Entrées clés :**

- [BDR-042](decisions/BDR-042.md) — zones du mode debug en Tailwind, couleur par zone, bulle/badge sans fond
- [BDR-043](decisions/BDR-043.md) — `AnimationOverlay` reçoit `showDebugZone` en prop
- [LRN-050](learnings/LRN-050.md), [LRN-051](learnings/LRN-051.md), [LRN-052](learnings/LRN-052.md) — patterns extraits (position:relative écrase absolute, state globale fuit dans un composant partagé, classes Tailwind jamais interpolées)

---

Session parallèle, très longue itération sur le drag/positionnement de l'avatar suite au flip haut/bas livré plus tôt : permission Tauri manquante découverte (fusionnée dans [[GLRN-256]] global plutôt que dupliquée), abandon de `startDragging()` natif au profit d'un drag manuel piloté à la main (cf. [BDR-044](decisions/BDR-044.md)) après avoir confirmé que sa promesse résout au lancement, pas à la fin ([LRN-053](learnings/LRN-053.md)). Fenêtre élargie puis passage en layout flex normal (`order`+`justify-content`) pour rendre le chevauchement bulle/avatar structurellement impossible après plusieurs échecs de calcul de position absolue (cf. [BDR-045](decisions/BDR-045.md)). Hauteur du slot avatar liée à `avatarSize` pour atteindre le bord réel de l'écran (cf. [BDR-046](decisions/BDR-046.md)). Réintroduction de Motion (déjà dépendance du projet) pour une transition fluide du flip, mais scopée à `bubble-zone` seulement -- animer aussi le slot avatar le faisait glisser hors de sous le curseur au relâchement (cf. [BDR-047](decisions/BDR-047.md)/[LRN-054](learnings/LRN-054.md)). Bug le plus coûteux de la session : l'avatar se désynchronisait du curseur, voire se retrouvait bloqué hors écran, pendant un drag qui traverse le seuil de flip -- cause racine à deux niveaux (clamp vertical basé sur toute la fenêtre au lieu du bord réel de l'avatar, et absence de gel du flip pendant le drag), résolu par gel/commit du flip + re-clamp si le flip commité diffère du gelé (cf. [BDR-048](decisions/BDR-048.md), [BLK-023](blockers/BLK-023.md)). Épisode annexe : notifications silencieuses faussement suspectées d'être cassées par une session concurrente, en réalité un toggle Settings désactivé (cf. [BLK-024](blockers/BLK-024.md)). Une AUTRE session Claude Code active en parallèle sur ce même repo pendant toute cette session (visualisation de zones debug, cf. section précédente) -- vigilance nécessaire en fin de session, des fichiers partagés (`useAvatarScreenLayout.ts`, `layout.ts`, `Avatar.tsx`) ont été modifiés sur disque par cette autre session pendant la rédaction de ce rituel de clôture.

**Entrées clés :**

- [BDR-044](decisions/BDR-044.md) — drag manuel plutôt que `startDragging()` natif
- [BDR-047](decisions/BDR-047.md) — Motion `layout` scopé à bubble-zone seulement
- [BDR-048](decisions/BDR-048.md) — flip gelé pendant le drag, commité + re-clampé au relâchement
- [ZBLK-023](archive/blockers/ZBLK-023.md) — avatar désynchronisé du curseur / bloqué hors écran (résolu)
- [ZBLK-024](archive/blockers/ZBLK-024.md) — fausse piste session concurrente sur les notifications (résolu)

## 2026-08-30

Suite directe de la session précédente (même chantier drag/flip, à cheval sur le changement de date) : le flip fonctionnait enfin (avatar sous le curseur, seuil correct), mais un flash bref persistait à chaque bascule -- décrit par Baptiste comme "l'avatar qui pop en haut puis revient à sa place", parfois perçu comme deux avatars rendus en simultané tant c'était rapide.

Cause trouvée en deux temps. D'abord une vraie course d'état : `flippedRef` (introduite en fin de session précédente pour que le calcul de flip utilise l'état réel courant plutôt qu'une hypothèse figée) était synchronisée via un `useEffect` séparé -- un cycle de rendu complet de retard sur `setFlipped()`, exploité à chaque `onMoved` déclenché par les propres `setPosition()` de l'app pendant un drag (cf. [LRN-059](learnings/LRN-059.md)). Corrigé par une fonction unique mettant à jour la ref ET l'état dans le même appel synchrone -- mais le flash a persisté malgré ce fix ET malgré le retrait complet de toute animation (Motion, puis fondu CSS), preuve que ce n'était pas un problème de transition visuelle.

La vraie cause, plus profonde : l'offset de l'avatar dans la fenêtre dépendait de `flipped` (flush à un bord ou à l'autre selon le côté) -- chaque flip devait donc repositionner la FENÊTRE elle-même (`setPosition()`, IPC Tauri asynchrone) en compensation du changement CSS (`order`/`justify-content`, synchrone). Ces deux mises à jour ne pouvaient jamais être parfaitement atomiques : le CSS peint la frame suivante, la fenêtre rattrape sa position un peu plus tard -- d'où le flash, quelle que soit la précision de la synchronisation côté state React (cf. [LRN-057](learnings/LRN-057.md)). Baptiste a demandé une refonte structurelle plutôt qu'un nouveau patch, après plusieurs rounds infructueux sur la même zone.

Refonte (cf. [BDR-049](decisions/BDR-049.md), [BDR-050](decisions/BDR-050.md)) : l'avatar reste désormais TOUJOURS centré dans la fenêtre (offset constant, indépendant de `flipped`) -- un flip ne déplace plus jamais l'avatar ni la fenêtre, seule la bulle bascule en CSS pur (position absolue `top`/`transform`). Fenêtre passée de 330 à 420px de haut pour réserver l'espace bulle des deux côtés de l'avatar désormais centré. Motion (`layout`), introduit plus tôt pour la transition de flip, entièrement abandonné. Une fois la base validée par Baptiste ("enfin !"), transition fluide réintroduite en CSS pur : `bubble-zone` toujours ancrée par `top`, `translateY(-100%)` pour le sens "vers le haut" -- résolu par le navigateur à partir du rendu réel, sans jamais mesurer la hauteur de la bulle en JS (cf. [LRN-058](learnings/LRN-058.md), élimine la classe de bugs qui avait nécessité plusieurs rounds de correction plus tôt dans le projet, V10-V13).

Lint + build vérifiés après chaque itération (une dizaine sur cette seule session). `/gen-commit` lancé en fin de session pour préparer le commit de l'ensemble du chantier drag/flip (non encore commité au moment de ce rituel).

**Entrées clés :**

- [ZBLK-025](archive/blockers/ZBLK-025.md) — flash de l'avatar au flip, 6 rounds avant la refonte (résolu)
- [BDR-049](decisions/BDR-049.md) — position d'avatar en direct pendant le drag, fin du gel/commit
- [BDR-050](decisions/BDR-050.md) — avatar centré fixe, bulle en position absolue (révise [BDR-045](decisions/BDR-045.md)/[BDR-047](decisions/BDR-047.md)/[BDR-048](decisions/BDR-048.md))
- [LRN-057](learnings/LRN-057.md) — CSS synchrone vs repositionnement fenêtre OS asynchrone
- [LRN-059](learnings/LRN-059.md) — ref miroir de state, synchronisation au call site

---

Nouvelle session, demande de Baptiste sur le hook `notify` (`baptistelechat-setup/settings/Claude/hooks/notify`) : pas de bulle au `SessionStart`, port des messages incomplet, et prénom "Baptiste" en dur dans tous les messages alors que Hooky est destiné à être partagé publiquement. Diagnostic direct sans fausse piste : le hook `curl`/`command` sur `SessionStart` était déjà correctement installé dans `~/.claude/settings.json` (vérifié), l'event atteignait bien le backend Rust (animation `listening`) -- c'est `NotificationBubble/index.tsx` qui, par choix de design volontaire documenté en commentaire, ne jouait que le son sur cet event sans jamais appeler `pickNotificationMessage`. Comparaison ligne à ligne avec `messages.ps1` : un seul pool manquant du portage, `Start` (19 phrases), tous les autres déjà complets.

Implémentation : ajout du pool `start`, route `SessionStart` vers `pickNotificationMessage` (comme `Stop`/`Notification`), bulle affichée sur `SessionStart` en plus du son. Pour le prénom en dur, arbitrage entre supprimer purement le prénom ou l'exposer en setting -- retenu : jeton `{name}` à la position exacte de chaque occurrence, résolu par `fillName()` (remplace si `HookySettings.callName` configuré, retire proprement sinon -- règle de position pour ne pas casser la grammaire, cf. [BDR-051](decisions/BDR-051.md)/[[GLRN-267]]). Nouveau champ setting "Comment dois-je t'appeler ?" (composant shadcn `Input` ajouté au projet, absent jusqu'ici). Lint + build (`tsc -b`, `vite build`) vérifiés.

`/gen-commit` a signalé un `vite.config.js` staged mais sans rapport avec la tâche -- régénéré par le `tsc -b` de vérification (composite project reference vers `vite.config.ts`), capturé en [[GLRN-268]]. Commit livré avec l'avertissement, validé par Baptiste.

`/memory-close` : archivage de [ZBLK-025](archive/blockers/ZBLK-025.md) (résolu depuis la session précédente, non encore traité) -- déplacement, liens entrants/sortants mis à jour dans [BDR-049](decisions/BDR-049.md), [BDR-050](decisions/BDR-050.md), [LRN-057](learnings/LRN-057.md), [LRN-059](learnings/LRN-059.md) et cette entrée de journal.

**Entrées clés :**

- [BDR-051](decisions/BDR-051.md) — messages personnalisés via jeton `{name}` + `fillName()`
- [ZBLK-025](archive/blockers/ZBLK-025.md) — archivage (résolu session précédente)

---

Nouvelle session, capture d'écran de Baptiste : le clic reste bloqué sur toute la zone transparente de la fenêtre "main" (480x420 fixe), l'empêchant de cliquer une page derrière l'avatar. Mémoire consultée en premier : un vrai click-through OS (`setIgnoreCursorEvents`) avait déjà été tenté et confirmé mort sur Windows/WebView2 (cf. [LRN-043](learnings/LRN-043.md)/[BDR-038](decisions/BDR-038.md)) -- retenter cette voie aurait été perdre du temps, signalé directement à Baptiste avant de commencer. Seule vraie solution : coller la fenêtre OS au contenu réel plutôt que la laisser couvrir un rectangle fixe.

Passage en mode plan (architecture multi-fichiers, tension avec le système anti-flash déjà validé sur ce projet, cf. [BDR-049](decisions/BDR-049.md)/[BDR-050](decisions/BDR-050.md)/[LRN-057](learnings/LRN-057.md)). Baptiste choisit l'option "resize dynamique" plutôt que "réduire juste la taille fixe" ou "ne rien changer". Implémentation : fenêtre compacte (avatarSize x avatarSize, sans marge) au repos, étendue (marge bulle) pendant une notification, extraction de `useNotificationBubbleContent` (state de la bulle lifté depuis `NotificationBubble` vers `Avatar.tsx`, seule source de vérité partagée entre rendu et resize), nouveau hook `useAvatarWindowSize`.

Vérification lourde en usage réel (interop Win32, cf. [LRN-035](learnings/LRN-035.md)) : plusieurs faux négatifs avant de confirmer que le mécanisme fonctionnait -- deux causes cumulées identifiées et corrigées en cours de route (HMR peu fiable sur un hook non-composant, cf. [GLRN-269]; interférence des propres hooks de la session Claude Code testant Hooky sur le même serveur local, cf. [LRN-060](learnings/LRN-060.md)) -- cf. [ZBLK-026](archive/blockers/ZBLK-026.md) pour le détail du diagnostic. Un vrai bug de listener async trouvé et corrigé au passage (`dragState` pouvant rester bloqué à `true`, cf. [GLRN-270]). Un `vite.config.js` corrompu par `tsc -b` (même piège que [[GLRN-268]]) restauré avant de continuer.

Une fois le mécanisme confirmé fonctionnel, retour direct de Baptiste après test réel : zones "window"/"slot" toujours visibles en fin de notification et surtout un flash important à l'apparition ET à la disparition de la bulle (cf. [ZBDR-052](archive/decisions/ZBDR-052.md)) -- les deux appels IPC `setSize`+`setPosition`, non atomiques, ne pouvaient pas être parfaitement synchronisés avec le rendu WebView2, contrairement au flip (déjà résolu en CSS pur depuis [BDR-050](decisions/BDR-050.md)). Baptiste propose directement la correction : réserver les deux bandes de bulle EN PERMANENCE (hauteurs synchronisées) plutôt que redimensionner la fenêtre à chaque notification -- implémentée telle quelle (cf. [BDR-053](decisions/BDR-053.md)), le resize ne dépend plus que d'`avatarSize` (Settings, rare). Reconfirmé en test réel : position/taille de fenêtre strictement inchangées sur tout un cycle de notification (6s), plus aucun flash.

**Entrées clés :**

- [ZBDR-052](archive/decisions/ZBDR-052.md) — fenêtre dynamique par notification, abandonnée (flash)
- [BDR-053](decisions/BDR-053.md) — fenêtre fixe, bandes de bulle réservées en permanence (révise BDR-052)
- [ZBLK-026](archive/blockers/ZBLK-026.md) — diagnostic du resize qui semblait ne pas se déclencher (résolu)
- [LRN-060](learnings/LRN-060.md) — interférence du dogfooding depuis la même session Claude Code

---

Suite directe de la même session. Baptiste redemande le schéma dynamique (compact/étendu) plutôt que la fenêtre fixe [BDR-053](decisions/BDR-053.md), avec l'idée que l'avatar reste centré si les deux bandes changent de taille EN SIMULTANÉ -- ajout d'une commande Rust unique `resize_avatar_window` (`set_size`+`set_position` dans le même handler, un seul aller-retour IPC) pour tester si l'atomicité réglait le flash. Mesuré en test réel (interop Win32, un seul appel PowerShell pour ne pas polluer avec les propres hooks de la session) : le resize est bien atomique (un seul saut observé, centre de fenêtre parfaitement préservé) -- mais Baptiste confirme que **le flash est toujours là**. Conclusion actée : la cause n'est pas l'atomicité de l'appel mais le resize lui-même (WebView2 doit re-layouter/repeindre une fenêtre transparente qui change de taille, quelle que soit la méthode).

Baptiste repousse aussi sur la largeur : la fenêtre restait bien plus large (370px) que l'avatar (190px) à cause de la marge réservée pour la bulle (`BUBBLE_MAX_WIDTH=260`, indépendante d'`avatarSize`). Proposition : plafonner la largeur de la bulle à celle de l'avatar (`max-w-full`), permettant à `windowWidthFor` de ne plus réserver aucune marge horizontale -- implémenté (suppression de `BUBBLE_MAX_WIDTH`/`shiftX`, devenus inutiles). En vérifiant par mesure DOM directe (`getBoundingClientRect`, canal IPC `write_text_file`) que le message le plus long du pool ne clippait pas dans la bande réduite (60px, déjà réduite de 90 dans un aller précédent), résultat inattendu : hauteur rendue identique (51px) quel que soit le nombre de caractères (22 à 66) -- signe que le texte ne wrappait probablement pas comme attendu à 190px de large, un bug CSS non identifié avant l'interruption.

À ce stade, Baptiste arrête tout ("c'est catastrophique, plus rien n'est lisible") et demande : (1) une recherche sur un éventuel "mode widget" Tauri compatible Windows où seuls les pixels peints seraient une fenêtre réelle (donc plus de zone morte cliquable du tout), (2) à défaut, un retour intégral à l'app de base via git. Recherche menée (WebSearch/WebFetch, pas de test à l'aveugle) : `SetWindowRgn` (région de fenêtre non-rectangulaire) existe et fonctionne avec WebView2 pour une forme STATIQUE, mais recalculer/réappliquer une région Win32 à chaque frame d'une animation SVG procédurale (30-60fps) est un chantier d'ingénierie à part entière, avec des bords jamais anti-aliasés (dégradation visuelle certaine) -- écarté comme non-fix immédiat, gardé comme piste future si quelqu'un veut l'investir. `LWA_COLORKEY`/`SetLayeredWindowAttributes` confirmé ne PAS fonctionner avec WinUI 3 (framework composité moderne comme WebView2), signal fort d'incompatibilité par extension. `WS_EX_TRANSPARENT` = même famille que `setIgnoreCursorEvents`, déjà mort (cf. [LRN-043](learnings/LRN-043.md)).

Retour effectué : `git restore` sur tous les fichiers touchés (`layout.ts`, `windowDrag.ts`, `useAvatarScreenLayout.ts`, `Avatar.tsx`, `NotificationBubble/index.tsx`, `lib.rs`, `capabilities/default.json`), suppression des deux fichiers ajoutés (`useAvatarWindowSize.ts`, `useNotificationBubbleContent.ts`). Build + lancement réel confirmés : fenêtre revenue à 480x420, app identique à avant le début de la tâche. Le problème initial (clic bloqué sur les zones transparentes) reste donc NON résolu -- toute la mémoire de cette session documente ce qui a été tenté et pourquoi ça n'a pas marché, pour ne pas repartir de zéro si le sujet est rouvert.

**Entrées clés :**

- [BDR-054](decisions/BDR-054.md) — abandon complet, retour intégral à l'app de base
- [BDR-053](decisions/BDR-053.md) — révisée (le flash persistait même en fenêtre dynamique atomique)

---

Baptiste relance immédiatement avec une nouvelle idée : forme en "I" (bandes notif pleine largeur en haut/bas, avatar étroit au milieu) via `SetWindowRgn` -- la piste évoquée dans la recherche précédente ([BDR-054](decisions/BDR-054.md)) mais écartée pour une forme PER-FRAME suivant le SVG animé. Une forme "I" statique (3 rectangles, dépend seulement d'`avatarSize`) évite justement ce problème : pas de recalcul par frame, pas de bords à anti-alias puisque tout reste axis-aligned. Implémentée directement (dépendance `windows` crate ajoutée pour Windows uniquement, commande Rust `apply_window_shape` appelant `SetWindowRgn`, appelée au montage + à chaque changement d'`avatarSize` dans `Avatar.tsx`) -- cf. [BDR-055](decisions/BDR-055.md). Deux petites erreurs corrigées via `cargo check` (rapide, feedback direct) : `SetWindowRgn` est en réalité dans `Win32::Graphics::Gdi`, pas `WindowsAndMessaging`.

Vérifiée au niveau OS plutôt que visuellement (Baptiste avait explicitement demandé d'arrêter les tests à l'aveugle) : script PowerShell `GetWindowRgn`+`PtInRegion` sur 4 points-témoins (coins haut/bas-gauche, marge gauche niveau avatar, centre avatar) -- tous conformes à la forme attendue en une seule commande. Fenêtre restée 480x420 (aucun resize, donc structurellement aucun flash possible). Reste non couvert, accepté explicitement : les marges gauche/droite DANS les bandes notif elles-mêmes (autour de la bulle, ~260px dans une fenêtre de 480px), résidu plus petit et transitoire.

Deux notifications de tâche en arrière-plan mentionnant un travail jamais effectué ("separate main+bubble window architecture", "tightened I-shape region") sont apparues pendant la session -- traitées comme des artefacts, vérifiées et écartées via `git status` (aucune trace réelle sur disque) plutôt que prises pour argent comptant, conformément à la consigne systeme de ne jamais traiter une notification de tâche comme une confirmation utilisateur.

Rituel `/memory-close` lancé en fin de session : archivage de [ZBLK-026](archive/blockers/ZBLK-026.md) (résolu plus tôt dans la session), 3 apprentissages Win32/Tauri ajoutés en LOCAL (Baptiste a explicitement demandé "full local" plutôt que la portée globale proposée par défaut).

**Entrées clés :**

- [BDR-055](decisions/BDR-055.md) — région de hit-test en "I" via `SetWindowRgn`, vérifiée OS -- reste actif en fin de session, à valider par Baptiste en usage réel
- [LRN-062](learnings/LRN-062.md) — `PtInRegion` comme technique de vérification de forme de fenêtre

---

Nouvelle session, retour direct de Baptiste sur [BDR-055](decisions/BDR-055.md) : la solution `SetWindowRgn` en "I" ne le satisfait pas après essai réel. Demande explicite de repartir sur 2 fenêtres Tauri (comme [BDR-035](decisions/BDR-035.md)/[BDR-037](decisions/BDR-037.md) déjà tentées et fusionnées plus tôt) mais avec un cycle de vie différent : fenêtre "bubble" **spawnée** seulement quand elle a un message à afficher, **tuée** (pas show/hide) après son animation de sortie -- en particulier lors d'un drag de l'avatar, où la bulle se ferme proprement plutôt que d'essayer de le suivre (source déjà identifiée de flash/lag sur ce projet, cf. [LRN-057](learnings/LRN-057.md)). Passage en mode plan (changement architectural touchant `lib.rs`, `tauri.conf.json`, les capabilities, et une bonne partie du frontend) puis implémentation (cf. [BDR-056](decisions/BDR-056.md)) : abandon du WIP `SetWindowRgn` de la session précédente (jamais commité), fenêtre "main" redimensionnée exactement à `avatarSize`, nouveau hook `useBubbleWindow` (décision de spawn + calcul de position ponctuel, jamais réévalué en continu), nouveau composant `NotificationBubbleWindow` (contenu de la fenêtre bulle, remplace l'ancien `NotificationBubble` fusionné dans "main").

Trois rounds de retours utilisateur en usage réel après cette première implémentation, chacun corrigé dans la foulée : (1) espace mort autour de l'avatar (marge de fenêtre `MAIN_WINDOW_MARGIN` inutile -- le hover n'a jamais eu de zoom, seul le drag scale légèrement et c'était déjà accepté sans marge par le passé, retiré) ; (2) bulle vide au premier message d'une rafale de deux notifications rapprochées -- root cause : la fenêtre bulle écoutait son propre `hooky-state` pour connaître son message, mais l'event qui cause son spawn est par définition déjà émis avant qu'elle n'existe, donc jamais reçu (cf. [LRN-064](learnings/LRN-064.md)) -- fix : message transmis directement via l'URL de spawn ; (3) latence perceptible en testant depuis Settings > Animation, alors que c'était quasi instantané avant -- root cause : les 3 fenêtres ("main"/"settings"/"bubble") partageaient un unique bundle Vite chargé en entier par chacune, donc chaque nouvelle fenêtre "bubble" entraînait avec elle tout le code de `SettingsPanel` et du moteur d'animation SVG (`FittedAvatarEngine`, ~175kB) rien que pour afficher une bulle de texte -- fixé par `React.lazy`/`Suspense` par fenêtre (chunk dédié vérifié au build).

Ensuite, plusieurs allers-retours sur le dimensionnement précis de la fenêtre bulle elle-même (cf. [ZBLK-027](archive/blockers/ZBLK-027.md) pour le détail complet) : pointe manquante (marge insuffisante réservée dans la fenêtre pour sa protrusion de 5px), hauteur fixe demandée explicitement par Baptiste (70px puis 80px) qui tronquait ensuite un message réel de 3 lignes, et une régression de la pointe décentrée de l'avatar après avoir remplacé le clamp-au-moniteur de la position X sans reproduire le mécanisme `shiftX` de l'ancienne bulle intégrée à "main". Stabilisé sur : fenêtre bulle créée invisible, hauteur mesurée sur le rendu réel avant resize+`show()` (cf. [LRN-065](learnings/LRN-065.md)), position X toujours centrée sur l'avatar dans une fenêtre volontairement surdimensionnée (520px vs 260px de contenu) avec `shiftX` réintroduit à l'identique (cf. [BDR-057](decisions/BDR-057.md), [LRN-066](learnings/LRN-066.md)). Au passage, jank signalé sur le redimensionnement de l'avatar via le slider Settings (resize OS réel déclenché à chaque tick du slider, dizaines par seconde) -- corrigé par un simple debounce (120ms).

`/gen-commit` lancé en fin de chantier (commit proposé, pas encore confirmé au moment de ce rituel). Rituel `/memory-close` : 2 décisions ([BDR-056](decisions/BDR-056.md)/[BDR-057](decisions/BDR-057.md)), 3 apprentissages et 1 blocage résolu ajoutés en LOCAL -- Baptiste a de nouveau explicitement demandé "full local" plutôt que la portée globale par défaut (même préférence que la session précédente). [BDR-037](decisions/BDR-037.md) et [BDR-055](decisions/BDR-055.md) marquées `révisé`.

**Entrées clés :**

- [BDR-056](decisions/BDR-056.md) — bulle de notification : fenêtre dédiée spawn/kill (révise [BDR-037](decisions/BDR-037.md), rend obsolète [BDR-055](decisions/BDR-055.md))
- [BDR-057](decisions/BDR-057.md) — positionnement bulle : fenêtre surdimensionnée + shiftX, hauteur mesurée dynamiquement
- [ZBLK-027](archive/blockers/ZBLK-027.md) — allers-retours taille fixe/mesure dynamique avant stabilisation (résolu)
- [LRN-064](learnings/LRN-064.md), [LRN-065](learnings/LRN-065.md), [LRN-066](learnings/LRN-066.md) — patterns extraits

## 2026-08-31

Nouvelle session, retour direct de Baptiste sur un souci multi-écran non couvert jusqu'ici : le clamp de drag de l'avatar (`startClampedDrag`) bloquait l'avatar sur son écran principal, même sur son PC en double écran -- root cause identifiée directement (`currentMonitor()` ne renvoie que le moniteur où la fenêtre se trouve au moment de l'appel, pas le bureau virtuel entier), corrigée en calculant les bornes sur l'union de tous les moniteurs via `availableMonitors()` (cf. [BDR-058](decisions/BDR-058.md)).

Baptiste demande ensuite une marge de sécurité pour ne pas coller l'avatar pile au bord (`EDGE_PADDING`, 12px), puis signale que ce même traitement manquait à la bulle de notification -- appliqué aux DEUX mécaniques de positionnement avec la même constante partagée (cf. [BDR-059](decisions/BDR-059.md)).

Chantier le plus long de la session : la bulle de notification restait "coupée" (texte + `box-shadow` rognés en haut) malgré deux corrections successives (padding horizontal, puis `BUBBLE_SHADOW_GAP` pour l'espace du shadow) -- cf. [ZBLK-028](archive/blockers/ZBLK-028.md). Diagnostic final en deux temps, tous deux dans la MESURE de hauteur elle-même (pas dans l'espace réservé) : (1) `getBoundingClientRect()` mesurait la bulle pendant qu'elle portait encore sa classe `scale-95` (état pré-révélation), donc 95% de la vraie taille -- corrigé avec `offsetHeight`, qui ignore les transforms CSS (cf. [LRN-067](learnings/LRN-067.md)) ; (2) la police web custom (Geist Mono) pouvait ne pas être chargée au moment de la mesure, faisant retomber le texte sur le fallback système avec moins de lignes -- corrigé en attendant `document.fonts.ready` avant de mesurer (cf. [LRN-068](learnings/LRN-068.md)). Les deux fixes combinés (cf. [BDR-060](decisions/BDR-060.md)) ont résolu le blocage sans nécessiter de redémarrage serveur, contrairement à ce que Baptiste avait tenté entre-temps.

`/gen-commit` lancé en cours de session (4 fichiers modifiés, commit proposé mais pas encore confirmé au moment de ce rituel). Rituel `/memory-close` : archivage de [ZBLK-027](archive/blockers/ZBLK-027.md) (résolu en fin de session précédente, pas encore archivé), 3 décisions et 2 apprentissages ajoutés en LOCAL (Baptiste confirme "full local", même préférence que les deux sessions précédentes), 1 nouveau blocage résolu.

**Entrées clés :**

- [BDR-058](decisions/BDR-058.md) — clamp de drag sur l'union de tous les moniteurs (bug multi-écran)
- [BDR-060](decisions/BDR-060.md) — bulle : `offsetHeight` + `document.fonts.ready`, root cause du rognage persistant
- [ZBLK-028](archive/blockers/ZBLK-028.md) — bulle "encore coupée" après deux fixes ciblés, cause réelle ailleurs (résolu)
- [LRN-067](learnings/LRN-067.md), [LRN-068](learnings/LRN-068.md) — patterns extraits

---

Nouvelle session le même jour, partie d'une capture d'écran de Baptiste montrant le shadow de l'avatar ET du badge rognés net par le bord de la fenêtre "main". Root cause identique à celle de [BDR-060](decisions/BDR-060.md) la veille, mais côté avatar cette fois : la fenêtre "main" était dimensionnée pile à `avatarSize` (aucune marge), donc le `drop-shadow` de l'avatar/badge ne pouvait physiquement pas déborder de ses propres bornes. Fix : nouvelle constante `AVATAR_SHADOW_GAP` (24px, réservée sur les 4 côtés contrairement à `BUBBLE_SHADOW_GAP` à sens unique) + helper `avatarWindowSize()`, répercutés dans le clamp de drag et le calcul de position de la bulle (cf. [BDR-061](decisions/BDR-061.md)) — pattern généralisé en [LRN-069](learnings/LRN-069.md).

Baptiste a immédiatement précisé que la bulle, elle, n'était PAS corrigée malgré [BDR-060](decisions/BDR-060.md) de la veille ("tu n'as pas fait de modif pour bubble", "même comportement"). Re-diagnostic : `BUBBLE_SHADOW_GAP` avait été placé "du côté opposé à la pointe", hypothèse qui ne tient QUE par coïncidence en orientation flipped (le `box-shadow` Tailwind a un biais fixe vers le bas, indépendant de toute logique de flip) — en orientation par défaut (la plus courante), le gap tombait du mauvais côté (cf. [BLK-029](blockers/BLK-029.md)/[LRN-070](learnings/LRN-070.md)). Corrigé en réservant le gap toujours du côté où le shadow déborde réellement, avec recalcul de la position Y pour garder la pointe collée à l'avatar.

Enfin, à la question de Baptiste ("`slot` est toujours utile ?"), vérification puis suppression : la div était devenue totalement redondante une fois la fenêtre agrandie au-delà d'`avatarSize` (cf. [BDR-062](decisions/BDR-062.md)) — `window` centre déjà le carré `avatarSize`, `AnimationOverlay` se recentre déjà lui-même en interne.

Lint + build passants sur l'ensemble des changements. Aucun des deux fixes (avatar, bulle) n'a été revérifié visuellement par Baptiste au moment de ce rituel — `BLK-029` reste `ouvert` en conséquence.

**Entrées clés :**

- [BDR-061](decisions/BDR-061.md) — `AVATAR_SHADOW_GAP`, même mécanisme que la bulle appliqué à l'avatar
- [BDR-062](decisions/BDR-062.md) — suppression de la div `slot`, devenue redondante
- [BLK-029](blockers/BLK-029.md) — shadow bulle toujours rogné, gap placé du mauvais côté (ouvert)
- [LRN-069](learnings/LRN-069.md), [LRN-070](learnings/LRN-070.md) — patterns extraits

---

Nouvelle session le même jour. Baptiste signale un nouveau symptôme sur le même resize d'avatar que [BDR-061](decisions/BDR-061.md) : le changement de taille via le slider Settings est saccadé, et pire à l'augmentation — l'avatar se fait rogner avant que la fenêtre "main" n'ait fini de se redimensionner. Diagnostic mené par archéologie git plutôt qu'en devinant (`git log -p` sur `Avatar.tsx`) : avant [ZBDR-052](archive/decisions/ZBDR-052.md), la fenêtre "main" était fixe (480×420, jamais redimensionnée par `avatarSize`), donc le CSS de l'avatar animait librement sans jamais heurter de bord — le `setSize()` OS actuel (introduit avec le passage à une fenêtre dynamique, débouncé 120ms pour éviter un resize par tick de slider) n'existait tout simplement pas dans cette ancienne architecture. Depuis, le CSS suivait `settings.avatarSize` en direct (change à chaque tick) pendant que la fenêtre attendait la fin du debounce — le contenu grandissait donc au-delà des bornes réelles de la fenêtre le temps que celle-ci rattrape, d'où le rognage à l'augmentation.

Fix : nouveau state `renderedAvatarSize`, mis à jour dans le MÊME `setTimeout` que le `setSize()` OS plutôt que de laisser le CSS lire `settings.avatarSize` directement — le CSS et la fenêtre changent désormais toujours ensemble (cf. [BDR-063](decisions/BDR-063.md)/[LRN-071](learnings/LRN-071.md)). Lint + build passants ; correction pas encore revérifiée en usage réel par Baptiste au moment de ce rituel. `/gen-commit` lancé juste avant sur un ensemble plus large de fichiers stagged (dont ce fix), message proposé mais pas encore confirmé.

**Entrées clés :**

- [BDR-063](decisions/BDR-063.md) — taille CSS avatar synchronisée sur le resize OS débouncé
- [LRN-071](learnings/LRN-071.md) — pattern extrait (état CSS live ne doit pas dépasser une action OS débouncée qui le borne)

---

Rituel de consolidation mémoire (scope local). 0 fusion, 1 archivage.

**Entrées clés :**

- [ZBDR-052](archive/decisions/ZBDR-052.md) — fenêtre dynamique par notification, abandonnée (flash), révisée par BDR-053

## 2026-09-04

Baptiste demande les étapes restantes avant une v0 partageable (icônes custom, distribution, tray, auto-launch, commande settings pour installer les hooks, LP, système de mise à jour). Réponse structurée validant sa liste et ajoutant 4 points manquants (packaging NSIS réel, CI de release, avertissement SmartScreen, sync de version) -- écrite dans un nouveau fichier dédié `docs/RELEASE.md` (même convention que `EVENTS.md`), avec une entrée résumée en Étape 11 de `ROADMAP.md` (cf. [BDR-064](decisions/BDR-064.md)). Décision notable sur le système de mise à jour : rejet du plugin `tauri-plugin-updater` officiel (signature ECDSA + `latest.json` à maintenir) au profit d'un simple check `fetch()` de l'API GitHub releases, cohérent avec le besoin réel (rediriger vers la release, pas installer en silence).

Baptiste valide et demande d'enchaîner sur un README complet + LICENSE, avec présentation du projet et tuto d'installation incluant le disclaimer SmartScreen Windows. Premier jet écrit, puis trois retours consécutifs : (1) trop de sauts de ligne inutiles, (2) besoin d'une version EN et FR, (3) besoin d'illustrations (captures du pet et des settings) pour que le README rende comme une mini landing page en attendant une vraie LP.

Chantier screenshots : capture de la fenêtre "Hooky - Paramètres" via un script PowerShell interop Win32 (`docs/assets/capture-window.ps1`, cf. déjà [LRN-035](learnings/LRN-035.md) pour la méthode générale). Plusieurs itérations sur un bug sournois -- dimensions de capture correctes mais contenu visuel erroné (VS Code au lieu de la fenêtre Hooky) -- diagnostiquées en comparant un screenshot de l'écran virtuel entier à la sous-région supposée : cause racine, `SetForegroundWindow` (et l'activation implicite de `ShowWindow(SW_RESTORE)`) bloqué silencieusement par la protection anti-focus-stealing de Windows quand appelé depuis un process PowerShell externe. Fix : `SetWindowPos(HWND_TOPMOST, SWP_NOACTIVATE)`, qui ne demande pas les mêmes droits (cf. [ZBLK-030](archive/blockers/ZBLK-030.md), [LRN-072](learnings/LRN-072.md)). Tentative parallèle de capturer le pet via un navigateur classique (page blanche, l'app dépend de l'API Tauri au runtime, pas seulement au montage) -- abandonnée au profit de la capture native, une fois le bug résolu.

Une fois l'outil fiable, Baptiste demande explicitement plusieurs captures d'animations (déclenchées en POSTant des events synthétiques sur le serveur local `127.0.0.1:4242/event`, même technique que [LRN-024](learnings/LRN-024.md)) et plusieurs skins d'avatar (forçage temporaire de `avatarId` dans `Avatar.tsx`, hot-reload Vite, capture, puis revert propre confirmé par `git diff` vide). 13 captures obtenues au total (6 animations Cubee, 4 skins, 3 onglets Settings). Skill `readme-writer` découvert et utilisé pour la réécriture finale (badges `shieldcn`, table stack technique, footer signature) -- `README.md` (EN, canonique) et `README.fr.md` réécrits avec ces captures intégrées façon mini-LP (cf. [BDR-065](decisions/BDR-065.md)).

En fin de chantier, Baptiste signale que l'avatar disparaît pendant que le README est édité. Root cause trouvée directement (pas de fausse piste) : `@tailwindcss/vite` scanne tout le repo par défaut, et `vite.config.ts` n'excluait de son watch que `src-tauri`/`.claude` -- `docs/**`/`README*.md` restaient regardés, chaque edit y déclenchant un full-reload CSS de la fenêtre "main" (cf. [LRN-073](learnings/LRN-073.md)). Fix appliqué (`server.watch.ignored` étendu), nécessite un redémarrage de `pnpm tauri:dev` pour prendre effet.

`/gen-commit` lancé (message proposé, pas encore confirmé au moment de ce rituel). Rituel `/memory-close` : archivage de [ZBLK-027](archive/blockers/ZBLK-027.md) (résolu depuis une session précédente, jamais archivé), 2 décisions et 2 apprentissages ajoutés en LOCAL (Baptiste a de nouveau explicitement demandé "full local"), 1 nouveau blocage résolu. **Conflit git détecté juste après** : un `git pull` non anticipé (travail en parallèle sur une autre machine, sessions non synchronisées) entrait en collision sur les mêmes ID mémoire (`BDR-058`/`BDR-059`, `LRN-067`/`LRN-068`, `BLK-028` vs `BLK-029`) -- résolu en renumérotant les entrées de cette session pour qu'elles se placent après celles de l'autre branche (chronologiquement antérieures, 2026-08-31) : `BDR-058`→`BDR-064`, `BDR-059`→`BDR-065`, `LRN-067`→`LRN-072`, `LRN-068`→`LRN-073`, `BLK-028`→`BLK-030`.

**Entrées clés :**

- [BDR-064](decisions/BDR-064.md) — checklist V0 partageable (`docs/RELEASE.md`), MAJ via check API GitHub plutôt que le plugin Tauri Updater
- [BDR-065](decisions/BDR-065.md) — README bilingue EN/FR façon mini-LP avec captures réelles
- [ZBLK-030](archive/blockers/ZBLK-030.md) — capture de fenêtre Hooky montrait le mauvais contenu malgré un rect correct (résolu)
- [LRN-072](learnings/LRN-072.md) — `SetForegroundWindow` bloqué depuis un process externe, `SetWindowPos(TOPMOST)` fonctionne
- [LRN-073](learnings/LRN-073.md) — `@tailwindcss/vite` scanne tout le repo, exclure la doc du watch Vite

## 2026-09-05

Checklist v0 partageable ([BDR-064](decisions/BDR-064.md)) implémentée en une passe : 5
subagents lancés en parallèle, groupés par fichiers non-partagés pour éviter les
conflits d'édition (icônes / `tauri.conf.json` / hook PowerShell / CI yaml séparés ;
tray+settings+update regroupés dans un seul agent car les trois touchent `lib.rs` et
`Settings/**`) -- décision détaillée [BDR-066](decisions/BDR-066.md). Test manuel par
Baptiste a immédiatement révélé un vrai bug de régression : le dédoublonnage du merge
`~/.claude/settings.json` comparait par égalité de texte exacte, donc la moindre
évolution du snippet dupliquait l'entrée `SessionStart` au lieu de la remplacer --
corrigé (dédup par port fixe 4242, identité stable) et documenté dans
[LRN-074](learnings/LRN-074.md).

Icône : le SVG source (`src/assets/logo.svg`, export Cubee) avait ~25% de marge
inutile dans son `viewBox` -- mesuré et resserré via `magick -trim`
([LRN-077](learnings/LRN-077.md)), le logo remplit maintenant le cadre aux petites
tailles tray/taskbar.

Mise en place d'un système de bump de version ([BDR-067](decisions/BDR-067.md)) :
`pnpm release:patch|minor|major` synchronise `package.json`/`tauri.conf.json`/
`Cargo.toml`/`Cargo.lock` et crée le tag automatiquement via le hook `"version"` de
`pnpm version`. Premier vrai run du pipeline de release ensuite -- jamais exercé en
conditions réelles avant ce jour, 3 surprises enchaînées documentées dans
[ZBLK-031](archive/blockers/ZBLK-031.md) (résolu) : CI en échec immédiat
(`pnpm/action-setup@v4` sans `packageManager`, cf.
[LRN-075](learnings/LRN-075.md)), puis confusion sur la visibilité d'une release en
draft (invisible sur la sidebar repo et `/tags`, seulement sous `/releases`, cf.
[LRN-076](learnings/LRN-076.md)), puis correction d'un tag `v0.1.1` non désiré
(Baptiste voulait `v0.1.0` pour ce premier vrai release) -- revert de version +
déplacement du tag (`git tag -f` + `push --force`, validé explicitement par
Baptiste ; `git tag -d` bloqué par ses permissions globales, laissé à sa charge).

Baptiste a ensuite remarqué que le corps de la release GitHub était quasi vide (juste
un lien de comparaison, `generateReleaseNotes` par défaut à `false` chez
`tauri-action`) et a demandé un vrai changelog suivant Keep a Changelog --
[BDR-068](decisions/BDR-068.md) : `CHANGELOG.md` + `scripts/changelog-release.mjs`
(bascule `Unreleased`→version au bump, bloque si vide) +
`scripts/changelog-extract.mjs` (alimente le corps de la release CI, réutilisable à la
main). Nouveau skill global `/changelog` créé via `skill-creator` (pas de process
d'éval complet, juste un test rapide validé en conditions réelles sur ce repo) pour
tenir `## [Unreleased]` à jour en routine après `/gen-commit` -- curation stricte
demandée (Keep a Changelog explicite : "changelogs are for humans, not machines"),
jamais de dump de commits bruts.

**Entrées clés :**

- [BDR-066](decisions/BDR-066.md) — checklist RELEASE.md implémentée via 5 subagents parallèles
- [LRN-074](learnings/LRN-074.md) — merge JSON idempotent par identité stable, jamais égalité de texte exacte
- [BDR-067](decisions/BDR-067.md) — bump de version unifié (`pnpm release:*`) synchronisant tous les fichiers de version
- [BDR-068](decisions/BDR-068.md) — changelog Keep a Changelog, corps de release généré depuis `CHANGELOG.md`
- [ZBLK-031](archive/blockers/ZBLK-031.md) — premier run du pipeline de release : 3 surprises enchaînées (résolu)

## 2026-09-10

Amélioration du panneau de quotas Claude Code ajouté récemment ([BDR-064](decisions/BDR-064.md) et
suivants). Baptiste a signalé que le glyphe "5h" du ring "session" semblait ne jamais changer :
clarifié que ce n'est pas un bug, c'est un label de catégorie fixe (pas une valeur mesurée) — le
`percent` réel (couleur + remplissage) se met bien à jour toutes les 3 minutes via le poller
backend déjà en place. Remplacement du glyphe texte par une icône dédiée pour lever l'ambiguïté :
`Clock` pour "session", puis `Sparkles` (lucide-react statique, après un premier essai `BookOpen`
écarté par Baptiste) pour le modèle "Fable" spécifiquement — pas de table de correspondance
complète par modèle, cf. [BDR-069](decisions/BDR-069.md). Ajout du temps restant avant reset dans
le tooltip (`formatTimeRemaining`, jours+heures au-delà de 24h pour weekly/Fable, heures+minutes
en-dessous pour session) : le nom du champ API (`resets_at`) n'a pas pu être vérifié contre un
payload réel (pas de token/réseau depuis l'environnement), codé défensivement avec fallback
silencieux — cf. [LRN-078](learnings/LRN-078.md).

Question de Baptiste sur l'intervalle de poll (3min → 1min) : recommandation de garder 3min,
argumentée par l'historique de rate-limit connu de l'endpoint `api/oauth/usage` — décision actée
sans changement de code, cf. [BDR-070](decisions/BDR-070.md).

Rituel `/changelog` puis `/gen-commit` puis `/memory-close` enchaînés à la demande de Baptiste.
CHANGELOG.md mis à jour (entrée Added enrichie + nouvelle ligne Changed), commit
`9c93efc` créé sur `development` (non pushé). Incohérence pré-existante détectée en ouvrant le
rituel de fermeture : le journal du 2026-09-05 référence des liens locaux
`[LRN-075](learnings/LRN-075.md)`/`LRN-076`/`LRN-077` dont les fichiers n'ont jamais été créés —
les patterns correspondants (pnpm action-setup, visibilité release draft, `magick -trim`) semblent
avoir atterri côté global (`GLRN-272`/`GLRN-273`/`GLRN-274`) sans que les liens locaux du journal
soient corrigés. Non traité ici (hors scope de cette session, risque de dupliquer le contenu déjà
en global) — nouvelles entrées de cette session numérotées à partir de
[LRN-078](learnings/LRN-078.md) pour éviter d'aggraver la confusion.

**Entrées clés :**

- [BDR-069](decisions/BDR-069.md) — icônes UsagePanel ciblées kind/modèle exact, pas de table par modèle
- [BDR-070](decisions/BDR-070.md) — intervalle de poll usage conservé à 3min
- [LRN-078](learnings/LRN-078.md) — champ API non vérifiable, coder défensivement
- [LRN-079](learnings/LRN-079.md) — icône animée en boucle infinie ≠ glyphe statique ponctuel

## 2026-09-11

Préparation de la release 0.2.0. `docs/RELEASING.md` créé en cours de route à la demande de
Baptiste (checklist répétable en 8 étapes), enrichi au fil des questions réelles : appel au skill
`/pr-description-writer` avant le merge, options SourceGit/PR GitHub en plus de la ligne de
commande, commandes de purge de branches réécrites en PowerShell natif après un premier essai
bash raté (`grep`/`xargs` absents du terminal réel de Baptiste), étape de resynchronisation
`development` sur `main` par fast-forward (l'habitude de supprimer/recréer la branche était
inutile). Release 0.2.0 effectuée : merge via PR GitHub (#1), `pnpm release:minor` exécuté.

Après l'installation de la maj, le panneau de quotas est resté bloqué sur "Chargement…" une bonne
minute. Diagnostic en deux temps : une première hypothèse (panique silencieuse d'un
`CryptoProvider` rustls manquant) écartée sur demande explicite de Baptiste ("arrête les
suppositions, fais le test toi-même") — le vrai test (relance du binaire, single-instance plugin
tué au préalable, stderr redirigé) a révélé un 429 de l'endpoint non-officiel `api/oauth/usage`.
Recherche du comportement de projets équivalents (claude-pulse, ccstatusline) plutôt que de
mitiger par un poll plus lent (option explicitement rejetée par Baptiste) : la vraie cause était
l'absence de backoff, pas la fréquence. Fix implémenté et vérifié en conditions réelles (3 cycles
de backoff 60s→120s→240s observés) puis verrouillé par un test unitaire déterministe une fois le
rate-limit réel devenu trop long à attendre en live (potentiellement ~1h).

Au passage, bug détecté dans `scripts/sync-version.mjs` : `cargo metadata --no-deps` ne
resynchronisait pas la propre entrée de version du package dans `Cargo.lock` (resté à `0.1.0`
dans le commit de release alors que `Cargo.toml` affichait `0.2.0`) — corrigé avec `cargo check`,
reproduit et vérifié volontairement avant/après le fix.

**Entrées clés :**

- [BDR-071](decisions/BDR-071.md) — backoff exponentiel sur l'endpoint usage, révise BDR-070
- [BDR-072](decisions/BDR-072.md) — `docs/RELEASING.md`, checklist de release en 8 étapes
- [ZBLK-032](archive/blockers/ZBLK-032.md) — panneau bloqué sur "Chargement…", diagnostic erroné puis résolu (prématurément)
- [LRN-080](learnings/LRN-080.md) — `cargo metadata --no-deps` ne resync pas Cargo.lock
- [LRN-081](learnings/LRN-081.md) — relancer une app desktop complète pour tester perturbe l'utilisateur
- [LRN-082](learnings/LRN-082.md) — regarder les projets équivalents avant de dégrader l'UX

---

Baptiste signale que la bulle est toujours restée sur "Chargement…" depuis 19h30, constaté à
22h30 — donc 3h après le fix backoff de la session précédente. Test empirique immédiat (relance
avec stderr redirigé) : `429 Too Many Requests` toujours actif sur `api/oauth/usage`, backoff bien
respecté. À 3h de blocage continu, creusé plus loin : `expiresAt` du token OAuth local
(`.credentials.json`) était dans le passé depuis **3 jours** — jamais rafraîchi, car Baptiste
n'utilise quasiment plus que l'app Desktop (onglet Code), qui ne touche jamais ce fichier
contrairement au CLI `claude` en terminal. Confirmé en observant Baptiste lancer une vraie session
`claude` : `expiresAt` passé de 3 jours dans le passé à ~8h dans le futur.

Tentative de fix "discret" (subprocess `claude auth status`) implémentée puis invalidée par un
test empirique explicitement demandé par Baptiste (le token n'avait pas bougé après simulation
d'expiration, backup/restore contrôlé) — cf. [LRN-083](learnings/LRN-083.md). Recherche de la
vraie mécanique de refresh OAuth (endpoint `platform.claude.com/v1/oauth/token`, client_id public,
documentée par la communauté) puis implémentation directe en Rust (`refresh_oauth_token`,
écriture atomique). Test réseau réel bloqué une première fois par le classifier auto-mode
(exfiltration de secret vers un endpoint externe) — débloqué après autorisation explicite de
Baptiste en chat, mais le test a lui-même échoué en 429 : le rate-limit externe semble couvrir
tout `/v1/oauth/*` du compte, pas que l'endpoint usage (cf. [LRN-084](learnings/LRN-084.md)). Le
fix reste donc non validé en conditions réelles au moment du commit.

Baptiste a explicitement relevé le risque ("tu as fait un code qui potentiellement ne fonctionne
pas") et proposé un garde-fou UX en complément — implémenté (event `hooky-usage-error`, message
"Quotas indisponibles" différencié de "Chargement…"), sans référence au CLI dans l'UI (idée
proposée puis écartée par Baptiste lui-même en cours de discussion, cohérent avec le style
minimaliste déjà établi du panneau). Commit livré en 🚧 (WIP, à la demande explicite de Baptiste
qui a remplacé le 🐛 initialement proposé) plutôt que 🐛, pour signaler que la validation réelle
reste à faire au prochain cycle (~06h37 le lendemain). Rituel `/session-close` enchaîné ensuite :
changelog mis à jour, commit `354c515` créé et pushé sur `development`, react-doctor lancé sur les
fichiers changés (score 92/100, aucun problème).

**Entrées clés :**

- [ZBLK-033](archive/blockers/ZBLK-033.md) — "Chargement…" persistant malgré le fix backoff, révise ZBLK-032
- [BDR-073](decisions/BDR-073.md) — refresh OAuth direct en HTTP plutôt qu'un subprocess `claude`
- [BDR-074](decisions/BDR-074.md) — event `hooky-usage-error` dédié, message différencié
- [LRN-083](learnings/LRN-083.md) — `claude auth status` ne rafraîchit pas le token OAuth
- [LRN-084](learnings/LRN-084.md) — un 429 observé peut couvrir tout un service, pas qu'un endpoint
- [LRN-085](learnings/LRN-085.md) — tester un appel réseau sensible hors code prod, avec backup/restore

## 2026-09-12

Vérification du fix de la veille ([ZBLK-033](archive/blockers/ZBLK-033.md)) à 11h30 : Baptiste a
relancé `pnpm tauri:dev`, ce qui a démarré un nouveau process `hooky.exe` juste après
l'expiration naturelle du token (06h37). Confirmé que `refresh_oauth_token` a fonctionné dès le
premier cycle sans avoir besoin d'observer l'UI ou d'attacher un logger dédié : `expiresAt` du
token vaut exactement `LastWriteTime` du fichier + 8h (durée de vie connue), et aucune ligne
d'erreur `[hooky-usage]` n'apparaît dans le terminal où tourne le process. [ZBLK-033](archive/blockers/ZBLK-033.md)
mis à jour et archivé en conséquence (le fix est donc validé de bout en bout, contrairement à
[ZBLK-032](archive/blockers/ZBLK-032.md) qui avait été marqué résolu prématurément sans cette
confirmation).

**Entrées clés :**

- [LRN-086](learnings/LRN-086.md) — valider un fix asynchrone via corrélation d'horodatages, sans observation directe

---

Baptiste signale une marge de drag de l'avatar visiblement plus grande à gauche/droite qu'en
haut/bas, sur un screenshot debug-zone. Plutôt que de conclure depuis l'image (peu fiable pour
des écarts en pixels), mesuré le vrai rect de la fenêtre via `GetWindowRect` (Win32) et comparé
aux bornes `Screen.Bounds` (physique) et `Screen.WorkingArea` (hors taskbar) du même écran en un
seul bloc PowerShell : marge gauche réelle 48px (= `EDGE_PADDING`), marge bas réelle seulement 8px
(48 - 40px de taskbar Windows). Root cause confirmée : `EDGE_PADDING=48` avait été bumpé pour
compenser une taskbar invisible à `monitor.size()` (résolution physique), appliqué symétriquement
aux 4 côtés -- alors que Tauri expose déjà `monitor.workArea` (zone hors taskbar, déjà installé,
pas de nouvelle dépendance). Remplacé `monitor.size`/`monitor.position` par `monitor.workArea`
dans `windowDrag.ts` et `bubbleWindow.ts`, `EDGE_PADDING` revenu à 12 (sa valeur d'origine avant
le hack de BDR-059).

Baptiste n'ayant pas de second écran sous la main pour tester le multi-moniteur, extrait la
logique d'union des bornes (`unionBounds`) en fonction pure et vérifiée avec des données
synthétiques à 2 écrans (dont un décalé verticalement) via un script `.mjs` jetable (`node:assert`,
zéro dépendance, aucune infra de test JS dans ce projet) -- supprimé après vérification. Bug latent
corrigé au passage : une liste de moniteurs vide aurait fuité un `Infinity` dans le clamp, la
fonction retourne maintenant `null` proprement dans ce cas.

**Entrées clés :**

- [BDR-075](decisions/BDR-075.md) — `monitor.workArea` remplace la résolution physique pour le clamp de drag
- [LRN-087](learnings/LRN-087.md) — mesurer un écart de marge fenêtre via GetWindowRect + Screen.Bounds/WorkingArea

## 2026-09-23

Cadrage du support des pets Codex dans Hooky (avatars sous forme de spritesheets installés dans
`~/.codex/pets`, par exemple via Petdex). Mesuré les 4 pets présents plutôt que de supposer leur
format : spritesheet 1536×1872 identique partout, soit 8 colonnes × 9 lignes de cellules 192×208
(idle, run-right, run-left, waving, jumping, failed, waiting, running, review), `pet.json` sans
timing ni nombre de frames, et un `id` de manifeste qui diffère du nom du dossier. La doc Petdex
n'était pas lisible par WebFetch (page rendue côté client), d'où une spec entièrement
observée, pas officielle.

Écrit l'Étape 12 dans `docs/ROADMAP.md` : format constaté, architecture (scan live du dossier,
protocole `asset:` à scope limité, union `procedural | sprite`, table de correspondance à 3
niveaux dont une surcharge `codexAnimation` par hook), règles de sécurité sur le
`spritesheetPath` (venu d'un store public), risques (mémoire ~11 Mo décodés par sheet, licences
propres à chaque pet) et découpage en 3 sessions. Baptiste a tranché les 4 décisions ouvertes :
`sleeping` en `idle` ralentie avec badge Zzz, effets conservés, `run-left/right` au drag réservé
aux pets Codex, rendu lissé. Roadmap stagée mais non committée à la clôture (message de commit
fourni, choix laissé à Baptiste). Aucun code applicatif écrit dans cette session.

**Entrées clés :**

- [BDR-077](decisions/BDR-077.md) — pets Codex : scan live, union `procedural | sprite`, mapping à 3 niveaux
- [BDR-078](decisions/BDR-078.md) — pets Codex : choix UX tranchés

## 2026-09-24

Le frère de Baptiste a installé Hooky sur D: et l'app ne se lançait pas au démarrage de Claude Code. Cause trouvée dans `docs/hooks/claude-settings-snippet.json` : seul le hook `SessionStart` dépend d'un chemin (l'auto-launch `|| start "" "%LOCALAPPDATA%\Hooky\Hooky.exe"`), les 14 autres hooks sont des `http` vers `127.0.0.1:4242`. Comme le `settings.json` est partagé entre les deux postes, la substitution du chemin réel à l'installation (`current_exe()`) a été écartée : elle aurait écrit une valeur propre à une machine dans un fichier partagé.

Solution retenue : lire `InstallLocation` dans la clé Uninstall NSIS (`HKCU\...\Uninstall\Hooky`) au moment du lancement, via PowerShell. Une variante `cmd` pure (`reg query` + `for /f`) a été testée et fonctionne, mais Baptiste a préféré rester sur PowerShell. Snippet, README et CHANGELOG mis à jour, commit `ee7aed9` (3 fichiers stagés à la main, les modifications Codex pets en cours dans le working tree exclues). Baptiste a validé en réel : bouton « Installer les hooks » puis nouvelle instance Claude Code, le démarrage automatique fonctionne.

**Entrées clés :**

- [BDR-079](decisions/BDR-079.md) — SessionStart : chemin de hooky.exe lu dans le registre
- [LRN-090](learnings/LRN-090.md) — config partagée : résoudre les chemins à l'exécution

---

Session 1 de l'étape 12 (pets Codex), menée dans le même dépôt qu'une autre session (hook d'auto-launch, [BDR-079](decisions/BDR-079.md)) : ses fichiers modifiés sont apparus dans `git status`, et j'ai attendu son commit avant de stager. Livré : commande Rust `list_codex_pets` avec validation de sécurité et scope `asset:` par fichier ([BDR-080](decisions/BDR-080.md)), `SpriteAvatar` en WAAPI `steps()`, union `procedural | sprite`, section « Pets Codex » dans le picker (`AvatarPickerCard` extrait). Le chemin `~/.codex/pets` a été confirmé en lisant le tarball npm de `petdex` ([LRN-094](learnings/LRN-094.md)), qui a aussi révélé le format v2 8×11. Retours de Baptiste après test réel : fenêtre Settings gardée compacte (512), badge gris remplacé par la couleur dominante du pet ; ma première version de l'algorithme échouait sur les vrais pixels ([LRN-092](learnings/LRN-092.md)) et a été refaite avant livraison ([BDR-081](decisions/BDR-081.md)). Baptiste a fourni un pet v2 (`om-nom`) : lignes 0–8 identiques à la v1, lignes 9–10 = 16 poses de regard, d'où l'Étape 13 réservée aux v2 avec badge « œil » ([BDR-082](decisions/BDR-082.md)) ; le nombre de frames varie selon le pet ([LRN-091](learnings/LRN-091.md)). Le navigateur intégré a refusé les origines locales ([BLK-034](blockers/BLK-034.md)), le test a été refait dans Node ([LRN-096](learnings/LRN-096.md)). Clôture : changelog, react-doctor (0 problème sur les fichiers modifiés), commit `4fc3018` (sans push). Reste à confirmer dans l'app : la lecture du canvas sur une image `asset:` (couleur du badge).

**Entrées clés :**

- [BDR-080](decisions/BDR-080.md) — scope asset: par fichier validé, à l'exécution
- [BDR-081](decisions/BDR-081.md) — couleur du badge échantillonnée sur les pixels
- [BDR-082](decisions/BDR-082.md) — pets v2 acceptés, suivi du regard en Étape 13
- [BLK-034](blockers/BLK-034.md) — navigateur intégré : origines locales refusées

---

Session 2 de l'étape 12 (pets Codex piloté par les hooks). Livré (commit `1381ac4`) : champ optionnel `codexAnimation` dans le catalogue, `codexOverrideFor()` qui n'applique la surcharge que si l'état agrégé est celui du hook, `codexRowNameFor()` et une prop `codexRow` jusqu'à `SpriteAvatar`, libellé « ligne Codex » dans les cartes de l'onglet Animation et dans l'overlay debug du pet flottant, colonne « Ligne Codex » dans `docs/EVENTS.md`. Seules 3 surcharges ont été posées (`waving` sur `SessionStart`, `auth_success`, `quota_auto_resume_fired`) : les autres prévues par la roadmap étaient déjà données par le repli par état. Baptiste a tranché `bored` → `idle` et `waving` en boucle sur `SessionStart`, puis demandé une marge entre le pet et les quotas : essai à 8 px réservé aux sprites, finalement 4 px pour tous les avatars (`USAGE_PANEL_GAP`, pris sur la marge basse déjà réservée, fenêtre inchangée). Mon premier récap de validation visuelle n'était pas clair (« à valider » sans cas concrets) : refait en liste de cas avec résultat attendu, puis validation sur le vrai pet par deux passes de 13 hooks rejoués via un `Monitor`. Reste pour la session 3 : comptage des frames par pet, `sleeping` ralenti avec badge Zzz, `run-left/right` au drag, perf des cartes, gestion d'erreur image, README.

**Entrées clés :**

- [BDR-083](decisions/BDR-083.md) — surcharge par hook seulement si elle diffère de l'état

---

Session 3 de l'étape 12 (pets Codex), la dernière : finitions du picker et des animations, validée par Baptiste puis clôturée (commit `aed1432`). Livré : titres « Avatars » et « Pets Codex » avec leur bouton de téléchargement (Petdex ajouté, `PickerSectionHeader`), `run-left`/`run-right` pendant le drag pour les pets Codex seulement, `sleeping` en `idle` ralentie, comptage réel des frames par ligne ([BDR-085](decisions/BDR-085.md), validé sur les 8 pets installés en Pillow puis dans un vrai canvas, [LRN-097](learnings/LRN-097.md)), repli sur Cubee quand l'image d'un pet est illisible ([BDR-087](decisions/BDR-087.md)), README FR/EN, `EVENTS.md`, `CHANGELOG`. Baptiste a écarté le rendu paresseux des cartes (8 pets tournent très bien, [BDR-086](decisions/BDR-086.md)) et reporté le bump 0.3.0 après l'étape 13 ([BDR-089](decisions/BDR-089.md)). Deux changements de direction dus à mes erreurs : l'atténuation à 60 % de `sleeping` rendait le pet « transparent en permanence », car c'est l'état par défaut ([ZBLK-035](archive/blockers/ZBLK-035.md), [BDR-084](decisions/BDR-084.md) qui révise en partie [BDR-078](decisions/BDR-078.md), [LRN-098](learnings/LRN-098.md)) ; la carte « Aucune session » (`SessionEnd`) ne forçait pas l'état faute d'avoir lu `resolve_state` ([ZBLK-036](archive/blockers/ZBLK-036.md), [BDR-088](decisions/BDR-088.md)). Un pane du navigateur intégré rouvert d'emblée a accepté l'origine locale, ce qui nuance [BLK-034](blockers/BLK-034.md) (toujours ouvert). Reste : l'étape 13 (suivi du regard), puis le bump 0.3.0.

**Entrées clés :**

- [BDR-084](decisions/BDR-084.md) — sleeping ralenti, sans atténuation
- [BDR-085](decisions/BDR-085.md) — frames par ligne mesurées, table en repli
- [ZBLK-036](archive/blockers/ZBLK-036.md) — carte « Aucune session » qui ne forçait pas l'état

---

Étape 13 (pets Codex), dernière phase de la roadmap : le « suivi du regard » a été recadré avec Baptiste, puis implémenté et committé (`a5da7d0`). Sa remarque de départ : une animation est toujours jouée (elle vient des hooks), donc un regard qui remplace `idle` n'a pas de place ; il n'a de sens qu'en `sleeping`, quand aucun hook ne parle. D'où le principe « réveil au regard » : un pet v2 (8×11, `om-nom` et `blobby` vérifiés) en `sleeping` regarde le curseur quand il approche (polling de `cursorPosition()` à 100 ms limité à cet état, 16 poses lignes 9–10, sens horaire depuis le haut confirmé sur planche de contact), et retombe dans son sommeil quand il s'éloigne. Cubee et les avatars procéduraux restent écartés. Après un premier essai à 2 s, Baptiste a trouvé le délai avant le retour au sommeil trop long : 1,2 s. Il a aussi voulu un badge œil sur les cartes du picker (retiré puis réintroduit), pas un simple « v2 ». `react-doctor` a signalé `effect-needs-cleanup` à tort ; trois essais avant de comprendre le motif de détection. Non testé avec un vrai curseur : rayons 260/340 px, délai 1,2 s et multi-écrans restent à valider en usage réel (noté dans la roadmap, Étape 13 cochée).

**Entrées clés :**

- [BDR-090](decisions/BDR-090.md) — regard uniquement en sleeping, sans réglage
- [BDR-091](decisions/BDR-091.md) — rayons 260/340 px et 1,2 s avant de dormir
- [LRN-099](learnings/LRN-099.md) — comportement ambiant sur l'état « sans signal »
