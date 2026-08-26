---
id: ZBLK-017
type: blocker
date: 2026-08-26
tags: [avatar, transition, css, regression, over-engineering, revert]
---

# ZBLK-017 — Transition crossfade custom cassait la transition existante du pet

| Friction                                                                                                                                                                                                                                                                                                                                              | Cause réelle                                                                                                                                                                                                                                                                               | Solution                                                                                                                                                                                                            | Statut |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Après ajout d'un composant `AvatarEngineView` dédié pour animer le changement de couleur en "métamorphose", Baptiste a signalé que le pet flottant (contrairement aux cartes settings) n'avait plus AUCUNE transition visible, et a jugé l'implémentation trop complexe par rapport à la transition simple déjà en place pour le changement d'avatar. | Le composant recevait un `style={{ transition: "width 300ms ease-out, height 300ms ease-out" }}` explicite depuis `Avatar.tsx`, qui écrasait/remplaçait entièrement la classe Tailwind `transition-opacity` pilotant le crossfade (même propriété CSS `transition`, l'inline style gagne). | Composant retiré, remplacé par l'extension du mécanisme déjà existant (clé de remount `avatarBundleKey` incluant les couleurs + `animate-in fade-in duration-300`), identique au traitement du changement d'avatar. | résolu |

## Références

- [BDR-033](../../decisions/BDR-033.md) — décision actée suite à ce blocage
- [LRN-032](../../learnings/LRN-032.md) — pattern extrait (étendre l'existant plutôt qu'un système parallèle)
