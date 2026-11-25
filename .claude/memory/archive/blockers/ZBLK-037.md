---
id: ZBLK-037
type: blocker
date: 2026-09-24
summary: "effect-needs-cleanup persistant après 2 restructurations"
tags: [react-doctor, effect-needs-cleanup, false-positive, debugging, useeffect]
status: résolu
---

# ZBLK-037 — effect-needs-cleanup persistant après 2 restructurations

**Friction** : React Doctor signalait `effect-needs-cleanup` sur `useCursorGaze` (score 53) alors que le `setTimeout` était bien nettoyé ; deux restructurations (cleanup toujours retourné, `setInterval` dans une expression conditionnelle) ne changeaient rien.

**Cause réelle** : Le détecteur descend dans les fonctions imbriquées (`setTimeout` récursif dans `tick` async) mais cherche le nettoyage au premier niveau de l'effet ; un `setInterval` dans une expression ternaire n'était pas reconnu non plus. Ce n'était pas un vrai leak.

**Solution** : Lecture de la doc canonique de la règle (`prompts/rules/...`) : garde en amont, `setInterval` posé directement dans le corps de l'effet, `clearInterval` retourné, garde `busy` contre le chevauchement. Score 53 → 60, plus aucun problème.

## Références

- GLRN-308 (mémoire globale) — pattern extrait
