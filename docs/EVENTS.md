# Events Claude Code → animations Cubee

Table de correspondance canonique, tenue à jour manuellement en miroir de
`animation_for_event()` (`src-tauri/src/lib.rs`). Historique/raisonnement des décisions
prises event par event : `ROADMAP.md`, étape 8.

Palette d'animations disponible côté moteur (23, export Studio) : seule une partie est
câblée côté backend, cf. table ci-dessous et section "Volontairement non mappé".
Animations actuellement utilisées : `sleeping, idle, listening, thinking,
searching, working, bored, confused, celebrate`.

`waking` a été retiré de cette liste le 2026-08-25 : c'était la seule animation qui
l'utilisait (`SessionStart` et `quota_auto_resume_fired`), corrigées toutes les deux
après validation visuelle -- voir encart dédié plus bas.

## Pets Codex : colonne « Ligne Codex »

Un pet Codex (spritesheet `~/.codex/pets`, cf. `ROADMAP.md` étape 12) n'a pas les 23 animations
du moteur : il joue une des 9 lignes de sa grille (`idle, run-right, run-left, waving, jumping,
failed, waiting, running, review`). La colonne « Ligne Codex » des tables ci-dessous donne la
ligne effectivement jouée pour chaque hook. Elle est calculée en deux niveaux
(`codexRowNameFor`, `src/lib/codexPets.ts`) :

1. **Surcharge par hook** (`codexAnimation`, `src/lib/animationCatalog.ts`) — marquée _(surcharge)_ :
   seulement là où la ligne diffère de ce que donnerait l'état. Appliquée uniquement si l'état
   agrégé multi-session est celui que ce hook produirait seul (`codexOverrideFor`).
2. **Repli par état** (`STATE_TO_ROW`) : `idle`→`idle`, `listening`→`waiting`, `thinking` et
   `searching`→`review`, `working`→`running`, `confused`→`failed`, `celebrate`→`jumping`,
   `bored`→`idle`, `sleeping`→`idle` (ralentie : pas de ligne dédiée).

Hors hooks, un pet Codex joue `run-left` / `run-right` pendant qu'on le déplace (sens du
déplacement horizontal, `startClampedDrag` dans `src/lib/windowDrag.ts`) : c'est la seule
surcharge qui ne vient pas du catalogue, et elle prend le pas dessus.

Aucun effet sur Cubee et les autres avatars procéduraux. Comme la table Cubee, elle se tient à
jour à la main et se valide visuellement dans l'onglet Animation.

## Table de correspondance

| Event                | Animation               | Note                                                                                                                                                | Ligne Codex            |
| -------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `SessionStart`       | `listening`             | Claude Code démarre et attend le premier prompt -- corrigé le 2026-08-25 après validation visuelle (`waking` ne se distinguait pas assez de `idle`) | `waving` _(surcharge)_ |
| `UserPromptSubmit`   | `thinking`              |                                                                                                                                                     | `review`               |
| `PreToolUse`         | `working` / `searching` | `searching` si `tool_name` ∈ `Grep, WebSearch, Glob, WebFetch`, sinon `working`                                                                     | `running / review`     |
| `PostToolUse`        | `idle`                  | Simple pause entre deux actions, pas une fin de tâche (contrairement à `Stop`)                                                                      | `idle`                 |
| `PostToolUseFailure` | `confused`              |                                                                                                                                                     | `failed`               |
| `Notification`       | voir sous-table         | Granularité par `notification_type` (payload du hook)                                                                                               | voir sous-table        |
| `Stop`               | `celebrate`             | Seul moment qui marque une vraie fin de tâche — voir encart dédié ci-dessous                                                                        | `jumping`              |
| `SessionEnd`         | —                       | Session retirée de la map, pas d'animation propre (plus aucune session → `sleeping`)                                                                | —                      |
| `StopFailure`        | `confused`              | Échec d'API pendant `Stop` — même famille que `PostToolUseFailure`                                                                                  | `failed`               |
| `SubagentStart`      | `working`               | Un sous-agent démarre du travail                                                                                                                    | `running`              |
| `SubagentStop`       | `idle`                  | Pause entre deux actions (le sous-agent n'est pas _la_ tâche que l'utilisateur a demandée)                                                          | `idle`                 |
| `PreCompact`         | `thinking`              | Compaction du contexte en cours                                                                                                                     | `review`               |
| `PostCompact`        | `idle`                  |                                                                                                                                                     | `idle`                 |
| `PermissionRequest`  | `listening`             | Attente d'une décision utilisateur                                                                                                                  | `waiting`              |
| `Elicitation`        | `listening`             | Un serveur MCP attend une réponse utilisateur                                                                                                       | `waiting`              |

### `Notification` — granularité par `notification_type`

12 valeurs documentées ([hooks.md](https://code.claude.com/docs/en/hooks.md), table "Matcher
patterns"), toutes couvertes explicitement — pas de valeur laissée au repli générique.

| `notification_type`          | Animation   | Pourquoi                                                                                                                                                                            | Ligne Codex                    |
| ---------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `permission_prompt`          | `listening` | Même intention que l'event `PermissionRequest`                                                                                                                                      | `waiting`                      |
| `elicitation_dialog`         | `listening` | Un serveur MCP attend une réponse — même intention que l'event `Elicitation`                                                                                                        | `waiting`                      |
| `elicitation_url_dialog`     | `listening` | Idem, un serveur MCP demande d'ouvrir une URL                                                                                                                                       | `waiting`                      |
| `elicitation_complete`       | `idle`      | Le formulaire MCP vient d'être soumis/fermé — retour à un état neutre                                                                                                               | `idle`                         |
| `elicitation_response`       | `idle`      | La réponse MCP vient d'être renvoyée — même conclusion que `elicitation_complete`                                                                                                   | `idle`                         |
| `agent_needs_input`          | `listening` | Un sous-agent attend une entrée utilisateur — même intention que `permission_prompt`                                                                                                | `waiting`                      |
| `agent_completed`            | `idle`      | Un sous-agent a terminé (succès **ou** échec, non distinguable ici) — même traitement neutre que l'event `SubagentStop`                                                             | `idle`                         |
| `quota_auto_resume_fired`    | `bored`     | Claude Code reprend le travail après une pause quota — corrigé le 2026-08-25 après validation visuelle (`waking` lisait plus comme une inactivité qu'un réveil actif)               | `waving` _(surcharge)_         |
| `quota_auto_resume_stale`    | `bored`     | Quota réinitialisé pendant une pause de plus de 30 min — signal d'inactivité prolongée (moins profonde que `idle_prompt`, qui passe en `sleeping`)                                  | `idle`                         |
| `quota_auto_resume_disabled` | `listening` | Claude Code abandonne l'attente sans reprendre — bloqué, a besoin d'une action utilisateur                                                                                          | `waiting`                      |
| `idle_prompt`                | `sleeping`  | Claude Code signale lui-même une session sans réponse depuis un moment — signal d'inactivité plus fort qu'un simple `bored` (auto-détecté par Claude Code, pas notre BORED_TIMEOUT) | `idle` _(ralentie, session 3)_ |
| `auth_success`               | `idle`      | Succès ponctuel isolé, pas la conclusion d'une tâche (contrairement à `Stop`) — `idle` reste le bon choix ici                                                                       | `waving` _(surcharge)_         |
| autre / absent (futur)       | `listening` | Repli — comportement générique conservé pour une valeur pas encore mappée ici                                                                                                       | `waiting`                      |

## Forks système invisibles ignorés (recap, auto-mémoire, suggestion)

Un fork système (recap de fin de tâche, consolidation mémoire, suggestion...) partage le
`session_id` de la session parente et porte un `agent_id`, exactement comme un sous-agent
explicite (Task/Explore/...) — mais son `agent_type` reste vide (`""`), alors qu'un
sous-agent explicite porte un type nommé. N'importe quel event reçu avec `agent_id` présent
et `agent_type` vide/absent est ignoré (ni inséré ni mis à jour dans la map de sessions).

Sans ce filtre, un `SubagentStop` de recap ravive `last_event_at` du groupe de session avec
`idle` — prioritaire sur `bored` dans `STATE_PRIORITY` — ce qui masque le `celebrate` du
`Stop` parent tant que cette entrée fantôme n'a pas elle-même décrû, et retarde `sleeping`
de tout ce délai.

## `celebrate` sur `Stop`

`Stop` est le seul event qui marque une vraie fin de tâche (le pendant de la notification
Windows "Claude Code" que Baptiste a déjà côté `~/.claude/hooks/notify/main.ps1` — elle se
déclenche aussi sur `Stop`, jamais en cours de tâche). Les autres events qui produisaient
`idle` (`PostToolUse`, `SubagentStop`, `PostCompact`) restent en `idle` : ce sont des pauses
_à l'intérieur_ d'un flux toujours actif, pas la conclusion demandée par l'utilisateur.

Pas de distinction succès/échec (`StopFailure` existe déjà séparément, mappé `confused`) :
un `Stop` normal veut dire "Claude a fini de répondre", pas "la tâche a réussi" — mais
puisque c'est la seule occasion disponible de marquer une fin de tâche, `celebrate` y est
appliqué systématiquement plutôt que réservé à un heuristique de succès plus fin (non
fiable, cf. section suivante).

Comme `idle`, une session en `celebrate` retombe sur `bored` après `BORED_TIMEOUT` (90s)
sans nouvel event — pas de mécanisme dédié ajouté, `effective_animation()` traite les deux
identiquement.

## Sons (cues)

Miroir de `src/lib/sounds.ts`. Pack `uisfx` (CC0), un dossier par « feel » (réglage
`soundFeel`, 12 caractères sonores) ; le mapping ci-dessous ne dépend pas du feel. Joué par
`useSoundEffects` dans la fenêtre `main` (pas la bulle, éphémère). **Un seul son par émission**,
et une transition d'état prime sur le cue de l'événement : entrée en `sleeping` → `sleep`,
sortie de `sleeping` → `wake`, **sauf** sur `SessionStart` qui joue son propre `start`. `wake`
ne sonne donc que quand un pet endormi reprend vie autrement qu'au démarrage d'une session
(fin d'un `idle_prompt`, Hooky relancé en cours de session). Ni `idle` (pause entre deux
outils, permanent) ni `bored` (retombée normale après chaque tâche) ne déclenchent `wake`.
`idle_prompt` n'a pas de cue propre (il produit `sleeping`). `SessionEnd` n'a pas de cue non
plus : le backend n'émet pas `SessionEnd` tel quel (`lastEvent` = événement de la session
dominante restante).

**Réglage « Moins bavard »** (`soundQuietMode`, off par défaut) : ne garde que les cues
essentiels — `start`, `wake`, `sleep`, `complete`, `mention`, `notification`, `error` — et coupe
tout le reste (ambiance informative : `send`, `checkpoint`, `unlock`, `play`, `invalid-drop`,
`collapse`, `seek`, `progress-step`, `queued`).

| Cue                                 | Événements                                                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `start`                             | `SessionStart`                                                                                                             |
| `wake`                              | sortie de `sleeping` (hors `SessionStart`)                                                                                 |
| `sleep`                             | entrée en `sleeping` (`idle_prompt`, plus aucune session)                                                                  |
| `complete`                          | `Stop`                                                                                                                     |
| `mention`                           | `permission_prompt`, `agent_needs_input`, `elicitation_dialog`, `elicitation_url_dialog`, `quota_auto_resume_disabled`     |
| `notification`                      | `Notification` de type inconnu/absent                                                                                      |
| `checkpoint`                        | `agent_completed`, `elicitation_complete`, `PostCompact`                                                                   |
| `unlock`                            | `auth_success`                                                                                                             |
| `send`                              | `UserPromptSubmit`, `elicitation_response`                                                                                 |
| `play`                              | `quota_auto_resume_fired`, `quota_auto_resume_stale`                                                                       |
| `error`                             | `StopFailure`                                                                                                              |
| `invalid-drop`                      | `PostToolUseFailure`                                                                                                       |
| `collapse`                          | `PreCompact`                                                                                                               |
| `seek` / `progress-step` / `queued` | `PreToolUse` recherche / autre outil / `SubagentStart` — fréquents : 1 son max toutes les 3 s, coupés par « Moins bavard » |

Silencieux, avec la raison (affichée aussi sur leur carte de l'onglet Animation) :

| Événement           | Raison                                                                                                                                                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PostToolUse`       | Se déclenche après chaque outil : un son à chaque fois serait une rafale. Le début d'outil (`PreToolUse`) a déjà son cue d'ambiance.                                                                                  |
| `SubagentStop`      | Doublon de la `Notification` `agent_completed` (déjà `checkpoint`) : un seul son par fin de sous-agent.                                                                                                               |
| `PermissionRequest` | Doublon de `Notification` `permission_prompt` : les deux hooks sont installés et arrivent quasi simultanément pour la même demande. Un seul son `mention`, porté par la Notification (seule à avoir aussi une bulle). |
| `Elicitation`       | Idem, doublon de `elicitation_dialog`.                                                                                                                                                                                |
| passage `bored`     | Dérive silencieuse au bout de `BORED_TIMEOUT`, sans hook ni action à signaler.                                                                                                                                        |
| `SessionEnd`        | Jamais reçu tel quel par le front, cf. plus haut.                                                                                                                                                                     |

**Ambiance de travail** (`soundLoopEnabled`, off par défaut) : boucle `streaming`, jouée en fond
tant que Claude travaille. Démarre sur `thinking` / `working` /
`searching`, se coupe (fondu 0,6 s) sur `celebrate` / `listening` (il t'attend) / `bored` /
`sleeping` ou sur `StopFailure`. `idle` (pause entre deux outils) et `confused` ne changent rien,
sinon elle clignoterait à chaque outil.

**Mixage façon jeu** : deux curseurs, en % (0-100). `soundVolume` (100 % par défaut) règle les cues,
`soundAmbienceVolume` (30 % par défaut) règle la boucle de fond. Les fichiers sont tous au même niveau ;
c'est le curseur d'ambiance, bas par défaut, qui en fait un vrai fond sonore. Courbe quadratique
(`toGain`) : 50 % ≈ −12 dB, 25 % ≈ −24 dB, pour que le bas du curseur reste utilisable. Relâcher le
curseur joue un aperçu (cue `complete` / 2,5 s de boucle). Le curseur d'ambiance agit en direct sur
une boucle déjà en cours, et **son aperçu ne joue pas pendant que Claude travaille** : la fenêtre
settings a son propre `AudioContext` et ne voit pas la boucle de la fenêtre `main` ; la fenêtre
`main` publie donc un drapeau (`hooky-loop-active`, localStorage) que l'aperçu consulte, sinon deux
boucles se superposeraient.

Onglet Animation : tant qu'il est ouvert, il émet `hooky-sound-preview` ; la fenêtre `main`
lève alors « Moins bavard » et le throttle pour que chaque carte sonne à chaque clic.

## Volontairement non mappé

Trois catégories distinctes, à ne pas confondre :

**`waking` — retiré, pas jamais câblé.** Utilisé jusqu'au 2026-08-25 par `SessionStart`
et `quota_auto_resume_fired` ; retiré des deux après une session de validation visuelle
dans la grille de test des settings (chaque animation rejouée en boucle à côté de sa
raison d'être documentée) : le rendu ne correspondait pas à ce que son nom promettait
dans ces deux contextes (cf. table et sous-table ci-dessus pour le détail par event). Ne
figure donc plus dans aucun `match` de `animation_for_event()` ni dans `STATE_PRIORITY`.

**Animations jamais câblées** — décision explicite (étape 6 du roadmap), pas un oubli :
`happy`, `proud`, `playful`, `suspicious`, `scared` (+ `angry`, `curious`, `surprised`,
`shy`, `sad`, `laughing`, `excited`, `drowsy` — présentes dans l'export du Studio mais
jamais évoquées comme candidates). Chacune demanderait un signal Claude Code plus précis
qu'un simple `Stop` (ex. distinguer un succès notable d'un "pong" trivial) qui n'existe
pas aujourd'hui — un heuristique de complexité de tâche resterait fragile et non vérifié
visuellement. À rouvrir si un vrai besoin se présente à l'usage.

**Events Claude Code non mappés** — bookkeeping interne sans valeur perçue claire pour un
pet de bureau, ou dont l'existence même en tant que hook officiel n'est pas confirmée avec
certitude (retour d'un agent de recherche daté du 2026-08-24, à vérifier dans la doc
officielle si l'un d'eux s'avère pertinent à l'usage) : `PermissionDenied`,
`TaskCreated`/`TaskCompleted`, `WorktreeCreate`/`WorktreeRemove`, `ConfigChange`,
`TeammateIdle`, `FileChanged`, `CwdChanged`, `DirectoryAdded`, `InstructionsLoaded`,
`ElicitationResult`, `MessageDisplay`, `Setup`, `UserPromptExpansion`, `PostToolBatch`. À
rouvrir au cas par cas si un besoin réel se présente à l'usage — pas un TODO oublié.

## Cas particulier `SessionStart` : pas de hook `http` natif

Depuis Claude Code v2.1.51, les hooks `type: "http"` ne sont pas supportés sur
`SessionStart`/`Setup` (restriction de sécurité non documentée officiellement,
[issue #28044](https://github.com/anthropics/claude-code/issues/28044)) — la requête ne
part jamais, sans erreur visible. `docs/hooks/claude-settings-snippet.json` utilise donc
un hook `type: "command"` (`curl` lisant le JSON du hook sur stdin) pour cet event
uniquement ; tous les autres events du tableau ci-dessus restent en `http` natif. Détail :
`docs/hooks/README.md`.

## Implémentation

- Mapping : `animation_for_event()`, `src-tauri/src/lib.rs`
- Décroissance `idle`/`celebrate` → `bored` après inactivité : `effective_animation()`, même fichier
- Agrégation multi-session + priorité : `resolve_state()`, même fichier
- Déclaration des hooks : `docs/hooks/claude-settings-snippet.json`
