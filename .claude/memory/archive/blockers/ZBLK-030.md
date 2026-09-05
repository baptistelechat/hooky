---
id: ZBLK-030
type: blocker
date: 2026-09-04
tags:
  [
    windows,
    win32,
    screenshot,
    powershell,
    setforegroundwindow,
    debugging,
    misdiagnosis,
  ]
---

# ZBLK-030 — Capture d'écran de la fenêtre Hooky montrait le mauvais contenu malgré un rect correct

| Friction                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Cause réelle                                                                                                                                                                                                                                                                                                                                                                                      | Solution                                                                                                                                                                                                                                                                                                                                                                                                                         | Statut |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Script PowerShell de capture d'écran automatisée (`docs/assets/capture-window.ps1`, pour les screenshots du README) retournait des dimensions cohérentes avec la fenêtre "Hooky - Paramètres" mais un contenu visuel systématiquement erroné (fenêtre VS Code capturée à la place). Plusieurs correctifs successifs sans effet : ajout de `DwmGetWindowAttribute` (bornes de fenêtre plus précises), ajout d'un `SetForegroundWindow` explicite, passage d'une capture partielle à une capture de l'écran virtuel entier suivie d'un crop. | La fenêtre cible restait réellement derrière VS Code en Z-order au moment de la capture. `SetForegroundWindow` et l'activation implicite de `ShowWindow(SW_RESTORE)`, appelés depuis un process PowerShell externe non focus, étaient tous deux silencieusement bloqués par la protection anti-focus-stealing de Windows -- aucune erreur remontée, donc invisible sans vérifier le Z-order réel. | Débogage méthodique par capture de l'écran virtuel entier (pas juste la sous-région supposée), sauvegardée à part pour inspection visuelle -- a révélé la position réelle de la fenêtre et confirmé qu'elle était bien occluse par VS Code malgré les tentatives de mise au premier plan. A permis d'isoler `SetWindowPos(HWND_TOPMOST, SWP_NOACTIVATE)` comme seule méthode fiable (cf. [LRN-072](../../learnings/LRN-072.md)). | résolu |

## Références

- [LRN-072](../../learnings/LRN-072.md) — pattern Win32 extrait de ce blocage
