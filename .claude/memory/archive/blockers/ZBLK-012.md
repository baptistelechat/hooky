---
id: ZBLK-012
type: blocker
date: 2026-08-25
tags: [badge, icon, tailwind, sizing, settings-grid]
---

# ZBLK-012 — Icônes de badge géantes dans la grille Settings (libellés tronqués)

| Friction                                                                                                                                                                                                                                 | Cause réelle                                                                                                                                                                                                                                                       | Solution                                                                                     | Statut |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------ |
| Après le remplacement par les icônes animées (`BDR-023`), la grille de validation (`AnimationCard.tsx`) affichait des icônes disproportionnées dans les badges "hook: animation", tronquant les libellés ("rking" au lieu de "working"). | `<Icon className="size-3 shrink-0" />` : les icônes animées rendent leur SVG dans un `<div>` wrapper, la classe Tailwind `size-3` ne stylisait que ce wrapper, le `<svg>` interne gardant son propre `width`/`height` (28 par défaut, jamais passé explicitement). | Passage explicite de `size={12}` en plus de `className="shrink-0"` dans `AnimationCard.tsx`. | résolu |

## Références

- [LRN-019](../../learnings/LRN-019.md) — pattern extrait (composant SVG dans un `<div>` ignore la classe de taille)
- [BDR-023](../../decisions/BDR-023.md) — travail qui a révélé ce bug
