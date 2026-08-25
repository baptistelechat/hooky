---
register: decisions
---

## Index

| ID                              | Date       | Titre                                                                        | Tags                                                                          | Statut |
| ------------------------------- | ---------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------ |
| [BDR-001](decisions/BDR-001.md) | 2026-08-24 | Moteur d'animation : Strobi/Cubee retenu (AGPL-3.0)                          | #avatar #animation-engine #agpl #licence #strobi #cubee                       | actif  |
| [BDR-002](decisions/BDR-002.md) | 2026-08-24 | Port axum fixe 4242, pas de fallback dynamique                               | #tauri #axum #port #hooks #architecture #localhost                            | actif  |
| [BDR-003](decisions/BDR-003.md) | 2026-08-24 | Eye tracking souris retiré, avatar simplement centré                         | #eye-tracking #cubee #scope-cut #ux #avatar                                   | actif  |
| [BDR-004](decisions/BDR-004.md) | 2026-08-24 | Migration moteur copié → package npm `@bible-strong/avatar-react`            | #avatar #npm-migration #bible-strong-avatar-react #agpl                       | actif  |
| [BDR-005](decisions/BDR-005.md) | 2026-08-24 | Avatar fusionné dans `src/components/`, noms génériques pour swap JSON       | #avatar #file-structure #components #generic-naming #testing-workflow         | actif  |
| [BDR-006](decisions/BDR-006.md) | 2026-08-24 | Mapping des hooks Claude Code finalisé (7 events ajoutés)                    | #hooks #animation-mapping #claude-code #roadmap #scope-decision               | actif  |
| [BDR-007](decisions/BDR-007.md) | 2026-08-24 | Fenêtre settings native séparée, localStorage seul                           | #settings #tauri #webviewwindow #localstorage #export-import                  | actif  |
| [BDR-010](decisions/BDR-010.md) | 2026-08-25 | SessionStart : hook `command`+`curl` au lieu de `http` natif                 | #claude-code #hooks #sessionstart #http #command #curl                        | actif  |
| [BDR-011](decisions/BDR-011.md) | 2026-08-25 | `celebrate` remplace `idle` sur `Stop`                                       | #cubee #animation #celebrate #stop #hooks-mapping                             | actif  |
| [BDR-012](decisions/BDR-012.md) | 2026-08-25 | Grille de validation visuelle des animations dans les settings               | #settings #animation-validation #tauri #css-grid #container-query #shadcn #ux | actif  |
| [BDR-013](decisions/BDR-013.md) | 2026-08-25 | SessionStart/quota_auto_resume_fired : mapping corrigé (validation visuelle) | #animation-mapping #claude-code #sessionstart #quota-resume #hooks #cubee     | actif  |
| [BDR-014](decisions/BDR-014.md) | 2026-08-25 | Composants en Tailwind, resets globaux gardés dans App.css                   | #tailwind #css #convention #app-css #index-html #scope                        | actif  |
| [BDR-015](decisions/BDR-015.md) | 2026-08-25 | Icônes de badge choisies par hook, pas par animation                         | #avatar #badge #icon #hooks #animation-mapping #ux                            | actif  |
| [BDR-016](decisions/BDR-016.md) | 2026-08-25 | Effets visuels du pet via Web Animations API native                          | #web-animations-api #animation #performance #no-dependency #css               | actif  |
| [BDR-017](decisions/BDR-017.md) | 2026-08-25 | avatarDefinition.ts centralise clamp/contraste/fit-scale                     | #avatar #validation #contrast #wcag #fit-scale #centralization                | actif  |
| [BDR-018](decisions/BDR-018.md) | 2026-08-25 | Highlight Animation tab : clic local, pas l'agrégat live                     | #settings #animation-validation #multi-session #ux #state-management          | actif  |
| [BDR-019](decisions/BDR-019.md) | 2026-08-25 | CORS permissif sur le serveur axum local                                     | #tauri #cors #axum #webview #fetch                                            | actif  |
| [BDR-020](decisions/BDR-020.md) | 2026-08-25 | Icônes de badge toujours visibles pendant que Claude travaille               | #avatar #badge #icon #hooks #animation-mapping #ux #work-indicator            | actif  |
| [BDR-021](decisions/BDR-021.md) | 2026-08-25 | Double-clic avatar : toggle focus/minimize de la fenêtre settings            | #tauri #webviewwindow #double-click #toggle #focus #minimize #ux #settings    | actif  |
| [BDR-022](decisions/BDR-022.md) | 2026-08-25 | `idle_prompt` → `sleeping` (remplace `bored`), STATE_PRIORITY exhaustif      | #cubee #animation #sleeping #bored #notification #idle-prompt #state-priority | actif  |
| [BDR-023](decisions/BDR-023.md) | 2026-08-25 | Icônes de badge remplacées par lucide-animated (copies locales + `motion`)   | #badge #icon #lucide-animated #motion #animation #hooks                       | actif  |
| [BDR-024](decisions/BDR-024.md) | 2026-08-25 | Badge reste un cercle simple, tentative de bulle BD abandonnée               | #badge #icon #ui-design #revert #speech-bubble                                | actif  |
| [BDR-025](decisions/BDR-025.md) | 2026-08-25 | Icône "listening" : CircleHelp conservé, MessageCircleMore réservé au repli  | #badge #icon #animation-mapping #listening #ux                                | actif  |
| [BDR-026](decisions/BDR-026.md) | 2026-08-25 | Clé de session (session_id, agent_id) au lieu de session_id seul             | #rust #hashmap #session-key #subagent #claude-code #hooks #multi-session      | actif  |
| [BDR-027](decisions/BDR-027.md) | 2026-08-25 | Résolution d'état 2 niveaux : priorité intra-session, récence inter-sessions | #rust #state-resolution #multi-session #priority #recency #claude-code        | actif  |
