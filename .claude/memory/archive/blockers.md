---
register: archive_blockers
---

## Index

| ID                               | Date       | Friction                                                                          | Tags                                                                                      | Statut |
| -------------------------------- | ---------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------ |
| [ZBLK-001](blockers/ZBLK-001.md) | 2026-08-24 | Fusion hooks dans settings.json bloquée — attribut ReadOnly                       | #windows #readonly #settings-json #claude-code #misdiagnosis                              | résolu |
| [ZBLK-002](blockers/ZBLK-002.md) | 2026-08-24 | Diagnostic avatar "disparaît" — 3 hypothèses avant la bonne                       | #tauri #debugging #hmr #tauri-dev #misdiagnosis #screenshot                               | résolu |
| [ZBLK-003](blockers/ZBLK-003.md) | 2026-08-24 | Install shadcn/Tailwind bloqué 3x par la quarantaine pnpm                         | #shadcn #pnpm #minimum-release-age #tailwind #install #npmrc                              | résolu |
| [ZBLK-004](blockers/ZBLK-004.md) | 2026-08-24 | Bouton Exporter silencieux (settings JSON)                                        | #tauri #export #blob #download #plugin-dialog #webview2                                   | résolu |
| [ZBLK-005](blockers/ZBLK-005.md) | 2026-08-25 | Avatar figé sur sleeping/SessionEnd malgré backend sain                           | #claude-code #sessionstart #http-hook #debugging #misdiagnosis                            | résolu |
| [ZBLK-006](blockers/ZBLK-006.md) | 2026-08-25 | Avatar invisible : process confondu avec le vrai bug                              | #avatar #debugging #misdiagnosis #process-management #screen-automation                   | résolu |
| [ZBLK-007](blockers/ZBLK-007.md) | 2026-08-25 | Badge disparaît ~10s : fausses pistes avant le vrai bug                           | #reaper #badge #debugging #misdiagnosis #cross-session                                    | résolu |
| [ZBLK-008](blockers/ZBLK-008.md) | 2026-08-25 | Fit-scale rétrécissait Cubee : getBBox puis calcul faux                           | #getbbox #fit-scale #regression #svg #debugging                                           | résolu |
| [ZBLK-009](blockers/ZBLK-009.md) | 2026-08-25 | Highlight multi-cartes : plusieurs itérations de design                           | #ui-design #highlight #multi-session #iteration #settings                                 | résolu |
| [ZBLK-010](blockers/ZBLK-010.md) | 2026-08-25 | Double-clic n'ouvrait plus la fenêtre settings au premier plan                    | #tauri #capabilities #permissions #acl #window #double-click #debugging                   | résolu |
| [ZBLK-011](blockers/ZBLK-011.md) | 2026-08-25 | Badge n'animait pas son entrée (fade+scale) malgré la sortie fonctionnelle        | #badge #css-transition #requestanimationframe #entry-animation                            | résolu |
| [ZBLK-012](blockers/ZBLK-012.md) | 2026-08-25 | Icônes de badge géantes dans la grille Settings (libellés tronqués)               | #badge #icon #tailwind #sizing #settings-grid                                             | résolu |
| [ZBLK-013](blockers/ZBLK-013.md) | 2026-08-25 | Rafale d'icônes rapprochées → glyphe bloqué invisible ("badge blanc")             | #badge #race-condition #debounce #glyph #real-world-bug                                   | résolu |
| [ZBLK-014](blockers/ZBLK-014.md) | 2026-08-25 | Animation Stop/SubagentStop/SessionStart incohérente en multi-session             | #multi-session #debugging #state-resolution #subagent #claude-code #hooks #race-condition | résolu |
| [ZBLK-015](blockers/ZBLK-015.md) | 2026-08-26 | Color pickers lents/lag lors de l'édition de couleur                              | #avatar #performance #lag #usememo #ipc #color-picker                                     | résolu |
| [ZBLK-016](blockers/ZBLK-016.md) | 2026-08-26 | Avatar disparaît en réglant une seule couleur                                     | #avatar #crash #undefined #schema-validation #partial-override                            | résolu |
| [ZBLK-017](blockers/ZBLK-017.md) | 2026-08-26 | Transition crossfade custom cassait la transition existante                       | #avatar #transition #css #regression #over-engineering #revert                            | résolu |
| [ZBLK-018](blockers/ZBLK-018.md) | 2026-08-26 | Boutons reset restent full-width malgré la largeur de fenêtre                     | #css #container-query #tailwind #field-group #button                                      | résolu |
| [ZBLK-019](blockers/ZBLK-019.md) | 2026-08-26 | `tauri dev` laissait un process zombie sur le port 1420                           | #tauri #dev-server #zombie-process #port-conflict #run-in-background                      | résolu |
| [ZBLK-020](blockers/ZBLK-020.md) | 2026-08-28 | Vérification visuelle de la bulle bloquée par le screenshot GDI                   | #tauri #webview2 #screenshot #gdi #powershell #directcomposition #debugging               | résolu |
| [ZBLK-021](blockers/ZBLK-021.md) | 2026-08-28 | Édition de settings.json bloquée, fausse piste ReadOnly                           | #settings-json #symlink #edit-tool #dotfiles #windows #powershell                         | résolu |
| [ZBLK-022](blockers/ZBLK-022.md) | 2026-08-29 | Double Stop/son/notification : plusieurs fausses pistes avant la vraie cause      | #rust #axum #reaper #desync #duplicate-events #debugging #misdiagnosis                    | résolu |
| [ZBLK-023](blockers/ZBLK-023.md) | 2026-08-29 | Avatar désynchronisé du curseur / hors écran pendant un drag qui flip             | #drag-drop #flip #cursor-sync #screen-edge #ux #debugging                                 | résolu |
| [ZBLK-024](blockers/ZBLK-024.md) | 2026-08-29 | Notifications silencieuses : fausse piste session concurrente                     | #notification #settings #debugging #misdiagnosis #false-lead                              | résolu |
| [ZBLK-025](blockers/ZBLK-025.md) | 2026-08-30 | Flash de l'avatar au flip : 6 rounds avant la refonte architecturale              | #drag-drop #flip #flash #screen-edge #architecture #debugging                             | résolu |
| [ZBLK-026](blockers/ZBLK-026.md) | 2026-08-30 | Notif ne redimensionnait pas la fenêtre : HMR + interférence du dogfooding        | #notification #window-resize #hmr #react-batching #debugging #misdiagnosis                | résolu |
| [ZBLK-027](blockers/ZBLK-027.md) | 2026-08-30 | Fenêtre bulle : allers-retours taille fixe / mesure dynamique avant stabilisation | #tauri #notification-bubble #window-resize #shiftx #iteration #ux                         | résolu |
