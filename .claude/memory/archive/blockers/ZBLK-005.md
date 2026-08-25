---
id: ZBLK-005
type: blocker
date: 2026-08-25
tags: [claude-code, sessionstart, http-hook, debugging, misdiagnosis]
---

# ZBLK-005 — Avatar figé sur `sleeping`/`SessionEnd` après une nouvelle session malgré un backend sain

| Friction                                                                                                                                                                                                                                                                                                                                          | Cause réelle                                                                                                                                                                                                                                                                                 | Solution                                                                                                                | Statut |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------ |
| Nouvelle session Claude Code lancée, notification `SessionStart` (hook `command` ps1 tiers) bien reçue, mais le pet restait figé sur l'état de la session précédente (`sleeping`/`SessionEnd`) — 3 hypothèses fausses avant la bonne (reload d'une fenêtre en arrière-plan sans rapport, race de rebuild `tauri:dev`, `ECONNREFUSED` transitoire) | Claude Code v2.1.51+ bloque silencieusement les hooks `type: "http"` sur `SessionStart` — confirmé en instrumentant le backend (`eprintln!` sur chaque payload reçu) puis en comparant à un headless `claude -p` : `UserPromptSubmit`/`Stop` arrivaient dans les logs, `SessionStart` jamais | [BDR-010](../../decisions/BDR-010.md) — hook `command`+`curl` à la place du `http` natif pour `SessionStart` uniquement | résolu |

## Références

- [BDR-010](../../decisions/BDR-010.md)
- [LRN-007](../../learnings/LRN-007.md), [LRN-008](../../learnings/LRN-008.md) — patterns extraits du même diagnostic
