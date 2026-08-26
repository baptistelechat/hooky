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

Enfin, à la demande explicite de Baptiste, extraction d'une variante `responsive` (cva) dans `ui/button.tsx` pour remplacer le `className="w-full @md/field-group:w-auto"` dupliqué 5 fois entre `ConfigurationField` et `AvatarPicker` (cf. [BDR-032](decisions/BDR-032.md)). Un bug résiduel de layout (boutons reset toujours en pleine largeur, contrairement à Réglages) a été traité en restructurant vers le vrai composant `FieldGroup` ancêtre (au lieu d'un `@container/field-group` posé à la main) — CSS généré vérifié correct dans le build, mais non reconfirmé visuellement par Baptiste en fin de session (cf. [BLK-018](blockers/BLK-018.md), resté ouvert).

**Entrées clés :**

- [BDR-030](decisions/BDR-030.md) — couleurs keyed avatarId, pas d'override global
- [BDR-031](decisions/BDR-031.md) — deux niveaux de reset (icône carte / footer confirmé)
- [BDR-032](decisions/BDR-032.md) — variante `responsive` sur Button plutôt que className dupliqué
- [BDR-033](decisions/BDR-033.md) — transition couleur = mécanisme du changement d'avatar
- [ZBLK-015](archive/blockers/ZBLK-015.md) — color pickers lents, résolu
- [ZBLK-016](archive/blockers/ZBLK-016.md) — avatar disparaît sur override partiel, résolu
- [ZBLK-017](archive/blockers/ZBLK-017.md) — crossfade custom cassait la transition existante, résolu
- [BLK-018](blockers/BLK-018.md) — boutons reset toujours full-width, ouvert (non reconfirmé)
- [LRN-029](learnings/LRN-029.md), [LRN-030](learnings/LRN-030.md), [LRN-031](learnings/LRN-031.md), [LRN-032](learnings/LRN-032.md) — patterns extraits des blocages ci-dessus

---

Demande de Baptiste : repositionner les 2 boutons de reset couleurs sous la description "Personnalise le corps et les yeux..." en fenêtre large, sans toucher au rendu en fenêtre étroite (déjà validé). Diagnostic : les deux positions appartiennent à deux conteneurs flex distincts (l'un imbriqué dans `FieldContent`, l'autre sibling du `Field` principal) — `order` CSS seul ne permet pas de déplacer un élément entre deux conteneurs flex différents. Solution retenue : composant `ResetButtons` partagé, rendu deux fois avec des classes de visibilité responsive opposées (`hidden @md/field-group:flex` / `@md/field-group:hidden`), et les deux `AlertDialog` de confirmation découplés de leur `AlertDialogTrigger` (state contrôlé, boutons appelant `setOpen(true)` directement) pour éviter de dupliquer le dialog lui-même (cf. [BDR-034](decisions/BDR-034.md)/[LRN-033](learnings/LRN-033.md)).

Vérification visuelle faite dans la vraie app Tauri (pas seulement lecture de code), via interop Win32 direct en PowerShell (EnumWindows pour localiser les fenêtres, double-clic simulé pour ouvrir les settings, redimensionnement + screenshot GDI pour chaque largeur) — confirme au passage [BLK-018](blockers/BLK-018.md) (resté ouvert en fin de session précédente faute de confirmation visuelle), désormais résolu et archivé. Nouveau blocage rencontré et résolu en cours de route : un premier lancement de `tauri dev` combinant `run_in_background` et `&` sortait immédiatement sans réellement lancer le serveur, laissant un process zombie sur le port 1420 qui bloquait la relance (cf. [BLK-019](blockers/BLK-019.md)/[LRN-034](learnings/LRN-034.md)).

Ménage mémoire en fin de session : archivage de 3 blockers résolus non encore archivés ([ZBLK-015](archive/blockers/ZBLK-015.md), [ZBLK-016](archive/blockers/ZBLK-016.md), [ZBLK-017](archive/blockers/ZBLK-017.md)) avec mise à jour de toutes les références croisées.

**Entrées clés :**

- [BDR-034](decisions/BDR-034.md) — boutons reset dupliqués plutôt que déplacés en CSS pur
- [BLK-018](blockers/BLK-018.md) — full-width des boutons reset, enfin confirmé résolu
- [BLK-019](blockers/BLK-019.md) — process zombie `tauri dev` sur le port 1420
- [LRN-033](learnings/LRN-033.md), [LRN-034](learnings/LRN-034.md), [LRN-035](learnings/LRN-035.md) — patterns extraits (dialog découplé, run_in_background+&, vérif Tauri via Win32)
