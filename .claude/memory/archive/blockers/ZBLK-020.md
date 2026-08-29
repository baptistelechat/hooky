---
id: ZBLK-020
type: blocker
date: 2026-08-28
tags:
  [tauri, webview2, screenshot, gdi, powershell, directcomposition, debugging]
---

# ZBLK-020 — Vérification visuelle de la bulle bloquée par le screenshot GDI

| Friction                                                                                                                                                                                                              | Cause réelle                                                                                                                                                                                                                                                                                                                           | Solution                                                                                                   | Statut |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------ |
| Impossible de confirmer visuellement l'affichage de la bulle de notification via captures PowerShell (`CopyFromScreen`), malgré 4 tentatives et repositionnement/zoom successifs sur la zone attendue — toutes vides. | Capture GDI classique incompatible avec le rendu matériel (DirectComposition) des fenêtres transparentes WebView2, alors que la chaîne applicative (position calculée, `setPosition()`/`show()` résolus, `isVisible()=true`) fonctionnait bout en bout — confirmé a posteriori par Baptiste qui voyait la bulle normalement à l'écran. | Abandon de la vérification par screenshot automatisé, demande de confirmation visuelle directe à Baptiste. | résolu |

## Références

- [LRN-036](../../learnings/LRN-036.md) — pattern extrait
- [BDR-035](../../decisions/BDR-035.md) — fenêtre concernée
