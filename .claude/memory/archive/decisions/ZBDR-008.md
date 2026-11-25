---
id: ZBDR-008
type: decision
date: 2026-08-25
summary: "Fichiers CSS custom bannis, tout en className Tailwind"
tags: [tailwind, css, convention, index-html, global-styles, no-css-file]
status: fusionné dans [BDR-014](../decisions/BDR-014.md)
---

# BDR-008 — Fichiers CSS custom bannis, styles en className Tailwind (y compris resets globaux)

**Décision** : `App.css` supprimé. Resets globaux (`html`/`body`/`#root`) posés en attribut `class` directement dans `index.html`. Styles de composants (`.pet-shell`, `.pet-window`, `.debug-overlay`) migrés en `className` Tailwind dans `Avatar.tsx`.

**Pourquoi** : Demande explicite de Baptiste : plus de fichier CSS séparé, tout en classNames Tailwind pour rester cohérent avec le reste du projet (déjà 100% Tailwind côté Settings).

**Alternatives considérées** : Garder `App.css` uniquement pour les vrais globaux (html/body/#root, non attachables à un élément JSX) vs. tout basculer y compris ces resets en `class=` sur `index.html` — cette dernière option retenue.

> ⚠️ Partiellement revert par [ZBDR-009](ZBDR-009.md) le lendemain : la migration des resets globaux (`html`/`body`/`#root`) vers `index.html` était trop large — seule la migration des 3 classes composant reste actée.

## Références

- [LRN-005](../../learnings/LRN-005.md) — pattern de migration extrait (spécificité CSS préservée)
- [ZBDR-009](ZBDR-009.md) — revert partiel de cette décision
