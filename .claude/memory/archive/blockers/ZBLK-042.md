---
id: ZBLK-042
type: blocker
date: 2026-09-26
summary: "Menu contextuel : ne se fermait pas, puis se fermait aussitôt"
tags: [tauri, context-menu, focus, dismiss, misdiagnosis, win32]
status: résolu
---

# ZBLK-042 — Menu contextuel : ne se fermait pas, puis se fermait aussitôt

**Friction** : Le menu du clic droit s'ouvrait mais restait affiché quand Baptiste cliquait ailleurs ou déplaçait le pet. Un premier correctif l'a fait se fermer aussitôt ouvert. Le suivant (redemande de focus) n'a pas été testé : la piste focus étant invalidée, j'ai changé de mécanisme.

**Cause réelle** : La fenêtre « menu » n'obtient pas de façon fiable le focus système. V1 : fermeture armée sur un event `focus: true` qui part avant l'écouteur, jamais armée. V2 : un filet `isFocused()` à 300 ms fermait la fenêtre puisqu'elle n'avait pas le focus. J'ai itéré sur des variantes de la même hypothèse (« la fenêtre a le focus ») sans vérifier qu'elle l'avait.

**Solution** : Surveillance de la souris côté Rust (thread + `GetAsyncKeyState`), indépendante du focus : ferme au premier clic hors zone ou sur Échap ([BDR-105](../../decisions/BDR-105.md)). Confirmé par Baptiste.

## Références

- [BDR-105](../../decisions/BDR-105.md) — la solution retenue
- [LRN-119](../../learnings/LRN-119.md) — le pattern extrait
