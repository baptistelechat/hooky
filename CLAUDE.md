## 💻 Hooky

Mini desktop pet Tauri qui réagit en temps réel aux hooks Claude Code CLI. L'avatar ne perçoit jamais le code — seulement les events (`SessionStart`, `PreToolUse`, `Notification`, `Stop`...) qu'un serveur local lui relaie, un peu comme des impulsions nerveuses.

### Stack technique

- **Frontend** : Vite + React 19 + TypeScript, fenêtre Tauri transparente 240×240 sans décorations
- **Backend** : Tauri v2 (Rust) + `axum` + `tokio`, serveur HTTP local démarré dans le `setup()` du `Builder`
- **Package manager** : pnpm
- **Moteur d'animation** : copié depuis `smontlouis/bible-strong-avatar-lab` (AGPL-3.0), 23 animations procédurales SVG sans dépendance externe

### Architecture

Claude Code CLI POST les events sur `http://127.0.0.1:4242/event` (port fixe, codé en dur — les hooks pointent dessus sans découverte dynamique possible). Le serveur axum maintient un state multi-session (`Arc<Mutex<HashMap<SessionId, SessionState>>>`), résout un état agrégé (`working` > `searching` > `thinking` > `listening` > `idle` > `bored`, `sleeping` si aucune session active) et l'émet via `app_handle.emit("hooky-state", ...)` vers le frontend, qui pilote l'animation de Cubee.

### Conventions importantes

- Port 4242 non configurable — un hook `http` qui échoue (app fermée) est traité comme non-bloquant par Claude Code, comportement volontaire.
- Le repo entier est sous licence AGPL-3.0 (héritée du moteur d'animation copié, pas consommé en dépendance npm) — projet destiné à être partagé publiquement.
- Décisions et raisonnements détaillés dans `docs/BRIEF.md` (conception initiale) et `docs/ROADMAP.md` (suivi d'avancement, causes racines des bugs corrigés).
