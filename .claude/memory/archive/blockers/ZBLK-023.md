---
id: ZBLK-023
type: blocker
date: 2026-08-29
tags: [drag-drop, flip, cursor-sync, screen-edge, ux, debugging]
---

# ZBLK-023 — Avatar se désynchronisait du curseur / sortait de l'écran pendant un drag qui flip

| Friction                                                                                                                                                                                                  | Cause réelle                                                                                                                                                                                                                                                                                                                                                                   | Solution                                                                                                                                                                                                                                                                          | Statut |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Pendant un drag qui traverse le seuil de flip (haut/bas), l'avatar se détachait visuellement du curseur, et dans le pire cas se retrouvait bloqué hors écran au relâchement (plus moyen de le re-saisir). | Le calcul de drag (`startClampedDrag`) suit la souris via un offset fixé au début du geste, en supposant implicitement que l'avatar reste au même endroit DANS la fenêtre -- un flip en plein drag déplace justement l'avatar à l'intérieur de la fenêtre (haut <-> bas), et le clamp vertical utilisait en plus toute la hauteur de fenêtre au lieu du bord réel de l'avatar. | Flip gelé pendant le drag + re-clampé au commit si le flip réel diffère du gelé (cf. [BDR-048](../../decisions/BDR-048.md), depuis révisée), clamp vertical basé sur le bord réel de l'avatar (cf. [BDR-046](../../decisions/BDR-046.md), [LRN-055](../../learnings/LRN-055.md)). | résolu |

## Références

- [BDR-048](../../decisions/BDR-048.md) — révisée depuis par [BDR-049](../../decisions/BDR-049.md)/[BDR-050](../../decisions/BDR-050.md)
- [LRN-055](../../learnings/LRN-055.md)
- [LRN-056](../../learnings/LRN-056.md)
