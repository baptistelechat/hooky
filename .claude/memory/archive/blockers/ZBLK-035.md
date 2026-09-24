---
id: ZBLK-035
type: blocker
date: 2026-09-24
tags: [codex-pets, sleeping, opacity, ux, feedback]
---

# ZBLK-035 — Sleeping atténué à 60 % : pet « transparent en permanence »

| Friction | Cause réelle | Solution | Statut |
| --- | --- | --- | --- |
| Après ajout de l'atténuation de `sleeping` (opacité 60 %), Baptiste a signalé, capture à l'appui, un pet « comme transparent en permanence », qui redevenait net pendant le drag. | `sleeping` est l'état par défaut (aucune session active) : l'opacité était donc toujours là au repos. Pendant mes essais, le drag (surcharge `run-left`/`run-right`, pleine opacité) et les déclenchements ponctuels masquaient le défaut. | Opacité retirée (`SLEEPING_OPACITY` et sa transition supprimées de `SpriteAvatar`), ralentissement et badge « zZz » conservés ; `EVENTS.md`, roadmap et `CHANGELOG` ajustés ([BDR-084](../../decisions/BDR-084.md)). | résolu |

## Références

- [LRN-098](../../learnings/LRN-098.md) — pattern extrait
- [BDR-084](../../decisions/BDR-084.md) — décision qui révise [BDR-078](../../decisions/BDR-078.md)
