---
id: ZBLK-021
type: blocker
date: 2026-08-28
summary: "Édition de settings.json bloquée, fausse piste ReadOnly"
tags: [settings-json, symlink, edit-tool, dotfiles, windows, powershell]
status: résolu
---

# ZBLK-021 — Édition de settings.json bloquée, fausse piste ReadOnly

**Friction** : `Edit` a refusé d'écrire dans `~/.claude/settings.json` malgré l'absence de toute protection en lecture seule visible (attribut Windows `attrib` propre, pas de hook bloquant détecté).

**Cause réelle** : Le fichier est désormais un symlink vers `baptistelechat-setup/settings/Claude/settings.json` (dotfiles repo) — `Edit` refuse par principe d'écrire à travers un symlink, mécanisme sans rapport avec l'ancienne protection ReadOnly de [ZBLK-001](ZBLK-001.md) que Baptiste s'attendait à devoir lever temporairement.

**Solution** : Résolution de la cible réelle du symlink via PowerShell (`(Get-Item ...).Target`), édition directe de ce fichier cible.

## Références

- [LRN-038](../../learnings/LRN-038.md) — pattern extrait
- [BDR-036](../../decisions/BDR-036.md) — décision motivant cette édition
