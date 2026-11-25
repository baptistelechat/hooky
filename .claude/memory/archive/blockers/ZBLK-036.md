---
id: ZBLK-036
type: blocker
date: 2026-09-24
summary: "Carte « Aucune session » (SessionEnd) ne forçait pas l'état"
tags: [animation-tab, preview, resolve-state, misdiagnosis, sessionend]
status: résolu
---

# ZBLK-036 — Carte « Aucune session » (SessionEnd) ne forçait pas l'état

**Friction** : La carte « Aucune session » ajoutée à l'onglet Animation (trigger `SessionEnd`) n'endormait le pet que si toutes les vraies sessions Claude Code étaient fermées, alors que l'onglet sert à forcer un état.

**Cause réelle** : J'ai proposé `SessionEnd` sans relire `resolve_state` (Rust) : la session la plus récemment active gagne. `SessionEnd` supprime la session de preview et laisse les vraies sessions décider, alors que les autres cartes forcent leur état en créant la session la plus récente.

**Solution** : La carte rejoue `idle_prompt`, l'event réel qui produit `sleeping` ([BDR-088](../../decisions/BDR-088.md)). Leçon : lire la logique d'agrégation avant de concevoir un contrôle de test.

## Références

- [BDR-088](../../decisions/BDR-088.md) — la solution retenue
