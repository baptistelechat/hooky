# Events Claude Code → animations Cubee

Table de correspondance canonique, tenue à jour manuellement en miroir de
`animation_for_event()` (`src-tauri/src/lib.rs`). Historique/raisonnement des décisions
prises event par event : `ROADMAP.md`, étape 8.

Palette d'animations disponible côté moteur (23, export Studio) : seule une partie est
câblée côté backend, cf. table ci-dessous et section "Volontairement non mappé".
Animations actuellement utilisées : `sleeping, waking, idle, listening, thinking,
searching, working, bored, confused, celebrate`.

## Table de correspondance

| Event                | Animation               | Note                                                                                                 |
| -------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `SessionStart`       | `waking`                | Distinct de `idle` : marque la transition depuis `sleeping`, pas un état de repos entre deux actions |
| `UserPromptSubmit`   | `thinking`              |                                                                                                      |
| `PreToolUse`         | `working` / `searching` | `searching` si `tool_name` ∈ `Grep, WebSearch, Glob, WebFetch`, sinon `working`                      |
| `PostToolUse`        | `idle`                  | Simple pause entre deux actions, pas une fin de tâche (contrairement à `Stop`)                       |
| `PostToolUseFailure` | `confused`              |                                                                                                      |
| `Notification`       | voir sous-table         | Granularité par `notification_type` (payload du hook)                                                |
| `Stop`               | `celebrate`             | Seul moment qui marque une vraie fin de tâche — voir encart dédié ci-dessous                         |
| `SessionEnd`         | —                       | Session retirée de la map, pas d'animation propre                                                    |
| `StopFailure`        | `confused`              | Échec d'API pendant `Stop` — même famille que `PostToolUseFailure`                                   |
| `SubagentStart`      | `working`               | Un sous-agent démarre du travail                                                                     |
| `SubagentStop`       | `idle`                  | Pause entre deux actions (le sous-agent n'est pas _la_ tâche que l'utilisateur a demandée)           |
| `PreCompact`         | `thinking`              | Compaction du contexte en cours                                                                      |
| `PostCompact`        | `idle`                  |                                                                                                      |
| `PermissionRequest`  | `listening`             | Attente d'une décision utilisateur                                                                   |
| `Elicitation`        | `listening`             | Un serveur MCP attend une réponse utilisateur                                                        |

### `Notification` — granularité par `notification_type`

12 valeurs documentées ([hooks.md](https://code.claude.com/docs/en/hooks.md), table "Matcher
patterns"), toutes couvertes explicitement — pas de valeur laissée au repli générique.

| `notification_type`          | Animation   | Pourquoi                                                                                                                 |
| ---------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| `permission_prompt`          | `listening` | Même intention que l'event `PermissionRequest`                                                                           |
| `elicitation_dialog`         | `listening` | Un serveur MCP attend une réponse — même intention que l'event `Elicitation`                                             |
| `elicitation_url_dialog`     | `listening` | Idem, un serveur MCP demande d'ouvrir une URL                                                                            |
| `elicitation_complete`       | `idle`      | Le formulaire MCP vient d'être soumis/fermé — retour à un état neutre                                                    |
| `elicitation_response`       | `idle`      | La réponse MCP vient d'être renvoyée — même conclusion que `elicitation_complete`                                        |
| `agent_needs_input`          | `listening` | Un sous-agent attend une entrée utilisateur — même intention que `permission_prompt`                                     |
| `agent_completed`            | `idle`      | Un sous-agent a terminé (succès **ou** échec, non distinguable ici) — même traitement neutre que l'event `SubagentStop`  |
| `quota_auto_resume_fired`    | `waking`    | Claude Code reprend le travail après une pause quota — même intention narrative que `SessionStart` : on se réveille      |
| `quota_auto_resume_stale`    | `bored`     | Quota réinitialisé pendant une pause de plus de 30 min — signal d'inactivité prolongée, même famille que `idle_prompt`   |
| `quota_auto_resume_disabled` | `listening` | Claude Code abandonne l'attente sans reprendre — bloqué, a besoin d'une action utilisateur                               |
| `idle_prompt`                | `bored`     | Claude Code signale lui-même une session sans réponse depuis un moment — signal réel d'inactivité, pas une écoute active |
| `auth_success`               | `idle`      | Succès ponctuel isolé, pas la conclusion d'une tâche (contrairement à `Stop`) — `idle` reste le bon choix ici            |
| autre / absent (futur)       | `listening` | Repli — comportement générique conservé pour une valeur pas encore mappée ici                                            |

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

## Volontairement non mappé

Deux catégories distinctes, à ne pas confondre :

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
