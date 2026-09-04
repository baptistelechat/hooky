---
id: ZBLK-028
type: blocker
date: 2026-08-31
tags:
  [
    tauri,
    notification-bubble,
    window-resize,
    debugging,
    css-transform,
    web-fonts,
  ]
---

# ZBLK-028 — Bulle de notification "encore coupée" après deux corrections ciblées, la vraie cause était ailleurs

| Friction                                                                                                                                                                                                                                                                             | Cause réelle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Solution                                                                                                                                                                                                                | Statut |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Baptiste signale la bulle rognée en haut (texte + `box-shadow`) avec capture d'écran. Une première correction ajoute `BUBBLE_SHADOW_GAP` (espace réservé pour le shadow) -- toujours rogné. Baptiste redémarre le serveur -- toujours rogné, avec deux nouvelles captures à l'appui. | Deux bugs distincts et indépendants du padding/espace réservé, tous deux dans la MESURE de hauteur elle-même (pas dans l'espace disponible) : (1) la mesure (`getBoundingClientRect()`) se faisait pendant que la bulle portait encore sa classe `scale-95` (état pré-révélation), donc mesurait 95% de la vraie taille (cf. [LRN-067](../../learnings/LRN-067.md)) ; (2) la police web custom (Geist Mono) pouvait ne pas être chargée au moment de la mesure, faisant retomber le texte sur le fallback système et moins de lignes (cf. [LRN-068](../../learnings/LRN-068.md)). Ajouter de l'espace réservé (`BUBBLE_SHADOW_GAP`) ne pouvait rien résoudre puisque la fenêtre était dimensionnée à partir d'une mesure DÉJÀ fausse en amont. | `offsetHeight` (ignore les transforms) à la place de `getBoundingClientRect()`, et `await document.fonts.ready` avant de mesurer -- élimine les deux courses en même temps (cf. [BDR-060](../../decisions/BDR-060.md)). | résolu |

## Références

- [BDR-060](../../decisions/BDR-060.md) — la correction finale
- [LRN-067](../../learnings/LRN-067.md), [LRN-068](../../learnings/LRN-068.md) — les deux patterns extraits
