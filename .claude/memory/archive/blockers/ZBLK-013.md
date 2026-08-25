---
id: ZBLK-013
type: blocker
date: 2026-08-25
tags: [badge, race-condition, debounce, glyph, real-world-bug]
---

# ZBLK-013 — Rafale d'icônes rapprochées → glyphe bloqué invisible ("badge blanc")

| Friction                                                                                                                                                                                                                                | Cause réelle                                                                                                                                                                                                                                                                                                         | Solution                                                                                                                                                                                                              | Statut |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| En usage réel, après le commit de BDR-023, deux hooks Claude Code déclenchés coup sur coup plus vite que le délai de crossfade (150ms) laissaient le badge affiché avec un cercle plein mais sans icône visible dedans ("badge blanc"). | Chaque changement d'icône relançait un nouveau `setTimeout` de fade-out avant que le précédent n'ait eu le temps de committer le swap vers la nouvelle icône — le state `glyphVisible` restait bloqué à `false` indéfiniment, le timer qui devait le repasser à `true` étant systématiquement annulé par le suivant. | Garde `fadeTimeoutRef` empêchant de relancer un nouveau timer tant qu'un swap est déjà en vol, combinée à `pendingIconRef` qui garde la cible la plus récente à appliquer quand le timer en cours se déclenche enfin. | résolu |

## Références

- [LRN-022](../../learnings/LRN-022.md) — pattern extrait (timer de transition en vol : garder, pas redémarrer)
- [BDR-023](../../decisions/BDR-023.md) — fonctionnalité qui a révélé ce bug
