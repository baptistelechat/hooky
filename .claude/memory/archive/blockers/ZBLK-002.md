---
id: ZBLK-002
type: blocker
date: 2026-08-24
summary: "Diagnostic avatar \"disparaît\" — 3 hypothèses avant la bonne"
tags: [tauri, debugging, hmr, tauri-dev, misdiagnosis, screenshot]
status: résolu
---

# ZBLK-002 — Diagnostic de l'avatar "qui disparaît" : 3 hypothèses avant la bonne

**Friction** : Baptiste signale que l'avatar Hooky disparaît par moments en dev ; 3 hypothèses proposées successivement (churn d'identité React Fast Refresh sur `createAvatar()` au scope module, graphe d'import cassé pendant un refactor multi-fichiers, puis enfin le vrai rebuild Tauri) avant confirmation

**Cause réelle** : Un onglet Chrome pointé sur `localhost:1420` (utilisé pour les 2 premières hypothèses) ne reproduit pas le runtime Tauri réel (`listen()`/`getCurrentWindow()` y échouent silencieusement, cf. GLRN-112 en mémoire globale) — impossible de confirmer/infirmer une hypothèse sur le comportement de la vraie fenêtre native depuis ce canal

**Solution** : Capture d'écran desktop réelle (PowerShell + `System.Drawing`, hors navigateur) prise à plusieurs instants pendant un `tauri:dev` relancé par Baptiste : a confirmé que la fenêtre disparaît exactement pendant `Compiling hooky v0.1.0...` et réapparaît à `Finished ... Running target\debug\hooky.exe`

## Références

- [LRN-004](../../learnings/LRN-004.md) — pattern extrait de ce diagnostic
