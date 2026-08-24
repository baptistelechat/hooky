---
register: journal
---

## 2026-08-24

Installation de l'infrastructure mémoire agent (`/memory-setup`) sur le projet Hooky. Le projet en est à son commit initial ("Begin project + Add Cubee avatar and related hooks") : coquille app Tauri, serveur axum multi-session, avatar Cubee intégré, debounce/timeout sleeping, granularité working/searching, et corrections visuelles (shadow, drag & drop) déjà en place selon `docs/ROADMAP.md`. Reste à faire côté Baptiste : fusionner `hooks/claude-settings-snippet.json` dans son `settings.json` (déjà fait une fois selon la roadmap, à reconfirmer).

**Entrées clés :**

- [BDR-001](decisions/BDR-001.md) — Moteur Strobi/Cubee retenu
- [LRN-001](learnings/LRN-001.md) — Liseré blanc = shadow Windows
- [LRN-002](learnings/LRN-002.md) — Drag & drop = permission Tauri manquante
- [BLK-001](blockers/BLK-001.md) — ReadOnly settings.json résolu
