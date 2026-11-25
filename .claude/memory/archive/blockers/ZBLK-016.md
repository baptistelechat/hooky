---
id: ZBLK-016
type: blocker
date: 2026-08-26
summary: "Avatar disparaît en réglant une seule couleur"
tags: [avatar, crash, undefined, schema-validation, partial-override]
status: résolu
---

# ZBLK-016 — Avatar disparaît en réglant une seule couleur

**Friction** : Éditer seulement une des deux couleurs (corps OU yeux) faisait disparaître l'avatar flottant (fenêtre transparente vide, aucune erreur visible).

**Cause réelle** : L'override de couleur transmis à `getAvatarBundle` contenait toujours les deux clés (`{ body, eyes }`), l'une valant `undefined` si non éditée -- le spread `{ ...colors, ...override }` écrasait alors la couleur non éditée par `undefined`, violant le schéma de validation runtime (`colors.eyes` requis en string) -> `createAvatar` throw synchrone sans error boundary (même famille que [LRN-013](../../learnings/LRN-013.md)).

**Solution** : `getAvatarBundle` ne merge que les clés de l'override réellement définies (`if (colorOverride?.body) colors.body = ...`).

## Références

- [LRN-013](../../learnings/LRN-013.md) — pattern déjà connu (schéma runtime peut rejeter une définition)
- [LRN-029](../../learnings/LRN-029.md) — pattern générique extrait (spread avec undefined explicite)
