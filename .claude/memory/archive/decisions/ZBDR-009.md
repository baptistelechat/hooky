---
id: BDR-009
type: decision
date: 2026-08-25
tags: [tailwind, css, revert, app-css, index-html, scope]
---

# BDR-009 — Revert partiel de BDR-008 : resets globaux remis dans `App.css`

| Décision                                                                                                                                                                                                                                                                                                | Pourquoi                                                                                                                                                                                                                                 | Alternatives considérées                                                                                                                                                                                                 | Statut |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| `App.css` recréé avec uniquement `:root`/`html,body`/`#root`. `index.html` revert à l'état neutre (plus de classes Tailwind sur `html`/`body`/`#root`). Les 3 classes composant (`.pet-shell`, `.pet-window`, `.debug-overlay`) restent supprimées d'`App.css` et en Tailwind inline dans `Avatar.tsx`. | Baptiste juge la conversion complète de [ZBDR-008](ZBDR-008.md) "trop forte" : seule la migration des 3 classes composant (équivalent Tailwind naturel) était voulue, pas le déplacement des resets globaux hors d'un fichier CSS dédié. | Garder [ZBDR-008](ZBDR-008.md) tel quel (100% Tailwind) vs. revert total (réintégrer aussi les 3 classes composant dans `App.css`) vs. le compromis retenu (resets seuls dans `App.css`, classes composant en Tailwind). | actif  |

## Références

- [ZBDR-008](ZBDR-008.md) — décision partiellement révisée par celle-ci
- [LRN-006](../../learnings/LRN-006.md) — pattern extrait (portée d'une convention appliquée trop largement)
