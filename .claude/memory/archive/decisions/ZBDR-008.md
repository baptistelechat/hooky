---
id: BDR-008
type: decision
date: 2026-08-25
tags: [tailwind, css, convention, index-html, global-styles, no-css-file]
---

# BDR-008 — Fichiers CSS custom bannis, styles en className Tailwind (y compris resets globaux)

| Décision                                                                                                                                                                                                                                   | Pourquoi                                                                                                                                                                 | Alternatives considérées                                                                                                                                                                                    | Statut |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `App.css` supprimé. Resets globaux (`html`/`body`/`#root`) posés en attribut `class` directement dans `index.html`. Styles de composants (`.pet-shell`, `.pet-window`, `.debug-overlay`) migrés en `className` Tailwind dans `Avatar.tsx`. | Demande explicite de Baptiste : plus de fichier CSS séparé, tout en classNames Tailwind pour rester cohérent avec le reste du projet (déjà 100% Tailwind côté Settings). | Garder `App.css` uniquement pour les vrais globaux (html/body/#root, non attachables à un élément JSX) vs. tout basculer y compris ces resets en `class=` sur `index.html` — cette dernière option retenue. | révisé |

> ⚠️ Partiellement revert par [ZBDR-009](ZBDR-009.md) le lendemain : la migration des resets globaux (`html`/`body`/`#root`) vers `index.html` était trop large — seule la migration des 3 classes composant reste actée.

## Références

- [LRN-005](../../learnings/LRN-005.md) — pattern de migration extrait (spécificité CSS préservée)
- [ZBDR-009](ZBDR-009.md) — revert partiel de cette décision
