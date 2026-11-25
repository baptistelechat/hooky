---
id: ZBLK-009
type: blocker
date: 2026-08-25
summary: "Highlight multi-cartes : plusieurs itérations de design"
tags: [ui-design, highlight, multi-session, iteration, settings]
status: résolu
---

# ZBLK-009 — Highlight multi-cartes dans l'onglet Animation : plusieurs itérations de design

**Friction** : Trois itérations sur le comportement de surlignage au clic dans la grille de validation : d'abord basé sur l'agrégat live (une seule carte visée mais plusieurs s'allumaient sans lien apparent avec le clic) ; puis explicitement redemandé "surligner toutes les cartes de la même animation" (mockup fourni) ; puis à nouveau rejeté ("tu allumes tout ceux qui ont la même animation") une fois constaté en usage réel que plusieurs cartes sans rapport direct s'allumaient ensemble.

**Cause réelle** : Le highlight dépendait de `useHookyState()`, l'agrégat live multi-session du backend -- toute session Claude Code active en parallèle (dont celle de l'agent en train de développer la fonctionnalité) contaminait l'état affiché, quel que soit le critère de correspondance choisi (animation ou label).

**Solution** : Découplage complet : état local `selectedLabel` dans `AnimationValidation`, mis à jour uniquement par le clic, sans dépendance à l'agrégat live -- une seule carte surlignée à la fois, celle du dernier clic exact.

## Références

- [BDR-018](../../decisions/BDR-018.md) — décision finale
