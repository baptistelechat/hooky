---
id: ZBLK-004
type: blocker
date: 2026-08-24
summary: "Bouton Exporter silencieux (settings JSON)"
tags: [tauri, export, blob, download, plugin-dialog, webview2]
status: résolu
---

# ZBLK-004 — Bouton Exporter silencieux (settings JSON)

**Friction** : Le bouton "Exporter" du panneau settings ne déclenchait rien au clic, aucune erreur console, comportement inexpliqué depuis le code applicatif seul

**Cause réelle** : Limitation Tauri connue (pas un bug de code) : `<a download>` sur une URL `blob:` ne fonctionne pas de façon fiable dans une webview Tauri, confirmé par recherche web (issues GitHub `tauri-apps/tauri`/`wry`)

**Solution** : Basculé vers `@tauri-apps/plugin-dialog` (`save()`) pour le choix du chemin + une commande Rust applicative custom `write_text_file` pour l'écriture -- pas le plugin `fs` officiel, qui aurait exigé un scope de chemins pré-déclaré en capability

Voir aussi GLRN-256 (mémoire globale, hors repo) pour le pattern générique extrait.
