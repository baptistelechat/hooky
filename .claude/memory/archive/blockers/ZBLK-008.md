---
id: ZBLK-008
type: blocker
date: 2026-08-25
tags: [getbbox, fit-scale, regression, svg, debugging]
---

# ZBLK-008 — Fit-scale rétrécissait Cubee : getBBox() puis formule diagonale fausse

| Friction                                                                                                                                                                                                                                                                                                                                                  | Cause réelle                                                                                                                                                                                                                                                                                                                                                                      | Solution                                                                                                                                                                                                                                                                                      | Statut |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Deux passages successifs pour corriger le crop de l'avatar "Sunee" (satellites débordant de la fenêtre fixe). Premier fix (`getBBox()` sur le SVG rendu) a introduit une régression : même l'avatar "Cubee", sans satellites, se retrouvait rétréci sans raison. Deuxième fix (calcul statique) laissait un léger crop persister sur "Sunee" malgré tout. | (1) `getBBox()` captait apparemment des éléments non visibles du moteur tiers, faussant la mesure pour tout avatar -- cf. [LRN-014](../../learnings/LRN-014.md). (2) Le calcul statique de remplacement utilisait une formule d'extension par axe séparé, qui sous-estime l'extension réelle d'un satellite positionné en diagonale -- cf. [LRN-015](../../learnings/LRN-015.md). | Remplacement de `getBBox()` par un calcul statique depuis les données déclarées de `avatar.json`, appliqué uniquement si l'avatar a des `body.nodes` (jamais Cubee/Onee) ; puis correction de la formule pour utiliser la distance euclidienne du centre + rayon plutôt que la somme par axe. | résolu |

## Références

- [LRN-014](../../learnings/LRN-014.md) — pattern extrait (getBBox non fiable)
- [LRN-015](../../learnings/LRN-015.md) — pattern extrait (formule géométrique)
- [BDR-017](../../decisions/BDR-017.md) — décision finale (calcul statique dans avatarDefinition.ts)
