---
id: ZBLK-014
type: blocker
date: 2026-08-25
tags:
  [
    multi-session,
    debugging,
    state-resolution,
    subagent,
    claude-code,
    hooks,
    race-condition,
  ]
---

# ZBLK-014 — Animation Stop/SubagentStop/SessionStart incohérente en usage multi-session

| Friction                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Cause réelle                                                                                                                                                                                                                                                                                                                                                                            | Solution                                                                                                                                                                                                                                                                                                                                                                                           | Statut |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Baptiste a rapporté à plusieurs reprises un affichage incohérent en usage réel : un `celebrate` (`Stop`) suivi d'un `SubagentStop` non désiré, puis un `SessionStart` masqué au lancement d'une nouvelle session (rejoue "n'importe quelle dernière animation jouée"). Plusieurs hypothèses non concluantes tentées avant la vraie cause : `autoMemoryEnabled` (rejeté par Baptiste, identique sur toutes ses machines), le spinner "running stop hooks 1/4" (réfuté par la doc officielle des hooks), un fork automatique du harness (piste correcte mais incomplète) | Deux bugs distincts dans `resolve_state`/`on_event` : (1) la `HashMap` était keyée uniquement par `session_id` — un `SubagentStop` (sous-agent visible OU fork système automatique) écrasait l'entrée du parent ; (2) `STATE_PRIORITY` servait aussi à arbitrer entre sessions DIFFÉRENTES, masquant une session qui démarre activement derrière un état "au repos" d'une autre session | Clé composite `(session_id, agent_id)` ([BDR-026](../../decisions/BDR-026.md)) + résolution à deux niveaux, priorité intra-session / récence inter-sessions ([BDR-027](../../decisions/BDR-027.md)) — les deux validés par tests curl isolés reproduisant exactement les séquences buguées, sur un process pris en main directement (backend tué et relancé manuellement, log de debug temporaire) | résolu |

## Références

- [BDR-026](../../decisions/BDR-026.md) — clé composite session_id/agent_id
- [BDR-027](../../decisions/BDR-027.md) — résolution d'état à deux niveaux
- [LRN-023](../../learnings/LRN-023.md), [LRN-024](../../learnings/LRN-024.md), [LRN-025](../../learnings/LRN-025.md) — faits/méthodes extraits de ce diagnostic
