---
id: ZBLK-011
type: blocker
date: 2026-08-25
tags: [badge, css-transition, requestanimationframe, entry-animation]
---

# ZBLK-011 — Badge n'animait pas son entrée (fade+scale) malgré la sortie fonctionnelle

| Friction                                                                                                                                                                                                         | Cause réelle                                                                                                                                                                                                                                                | Solution                                                                                                                                                                                                                                                      | Statut |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Après avoir séparé le crossfade du cercle et du glyphe du badge, la disparition fondait bien mais l'apparition restait instantanée (Baptiste : "j'ai bien une animation pour la sortie mais pas pour l'entrée"). | Le nœud DOM du cercle (et celui du glyphe) était monté directement à son état visuel final dans le même rendu — sans paint intermédiaire à l'état "caché", la transition CSS n'avait rien à interpoler et le navigateur affichait directement l'état final. | Découplage de `containerMounted` (présence DOM) et `containerVisible` (opacity/scale), ce dernier basculé à `true` seulement après un double `requestAnimationFrame` imbriqué pour garantir un paint intermédiaire à l'état caché avant de passer au visible. | résolu |

## Références

- [LRN-020](../../learnings/LRN-020.md) — pattern extrait (transition d'entrée = double rAF)
- [BDR-023](../../decisions/BDR-023.md) — travail qui a révélé ce bug
