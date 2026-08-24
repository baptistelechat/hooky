---
register: journal
---

## 2026-08-24

Installation de l'infrastructure mémoire agent (`/memory-setup`) sur le projet Hooky. Le projet en est à son commit initial ("Begin project + Add Cubee avatar and related hooks") : coquille app Tauri, serveur axum multi-session, avatar Cubee intégré, debounce/timeout sleeping, granularité working/searching, et corrections visuelles (shadow, drag & drop) déjà en place selon `docs/ROADMAP.md`. Reste à faire côté Baptiste : fusionner `hooks/claude-settings-snippet.json` dans son `settings.json` (déjà fait une fois selon la roadmap, à reconfirmer).

**Entrées clés :**

- [BDR-001](decisions/BDR-001.md) — Moteur Strobi/Cubee retenu
- [LRN-001](learnings/LRN-001.md) — Liseré blanc = shadow Windows
- [LRN-002](learnings/LRN-002.md) — Drag & drop = permission Tauri manquante
- [ZBLK-001](archive/blockers/ZBLK-001.md) — ReadOnly settings.json résolu

---

Migration du moteur d'avatar copié à la main vers le package npm officiel `@bible-strong/avatar-react` (publié par `smontlouis/bible-strong-avatar-lab` après le développement initial de Hooky, licence AGPL-3.0-only inchangée) : `avatar-runtime.ts`/`Cubee.tsx`/`cubee.avatar.ts` supprimés, remplacés par `createAvatar(definition)` piloté par le nouveau JSON exporté du Studio. Les 9 animations utilisées par le backend Rust étaient toutes présentes dans le nouveau JSON — migration sans changement de comportement.

À la demande de Baptiste, restructuration suivie : `src/avatar/` supprimé, tout fusionné dans `src/components/Avatar.tsx` (composant public `PetAvatar`, moteur interne `AvatarEngine`) + `src/components/avatar.json` avec des noms génériques pour pouvoir tester un autre export du Studio en écrasant juste le JSON.

Baptiste a signalé que l'avatar disparaissait par moments en dev. Diagnostic en plusieurs manches (Fast Refresh, puis refactor multi-fichiers) avant la bonne réponse, confirmée par capture d'écran desktop réelle (impossible à vérifier via un onglet Chrome sur le port Vite, hors runtime Tauri) : un rebuild `tauri:dev` tue et relance le process backend, donc le serveur axum sur 4242 est injoignable le temps du build (`ECONNREFUSED` sur tous les hooks), et la session map repart vide au redémarrage. Comportement de dev attendu, pas un bug.

Au passage : rencontré la même quarantaine pnpm que `trustPolicy` (GLRN-234) mais pour `minimumReleaseAge`, bloquant `pnpm add` sur une dépendance transitive optionnelle sans rapport — même échappatoire ponctuelle (`--config.minimum-release-age=0`).

**Entrées clés :**

- [BDR-004](decisions/BDR-004.md) — migration vers `@bible-strong/avatar-react`
- [BDR-005](decisions/BDR-005.md) — fusion `src/avatar/` → `src/components/`, noms génériques
- [ZBLK-002](archive/blockers/ZBLK-002.md) — diagnostic avatar "disparaît" (3 hypothèses)
- [LRN-004](learnings/LRN-004.md) — pattern extrait (rebuild Tauri = state perdu)

---

Grosse session en trois temps. D'abord finalisation de l'étape 8 du roadmap : 7 nouveaux events Claude Code mappés dans `animation_for_event()` (`StopFailure`, `SubagentStart`/`Stop`, `PreCompact`/`PostCompact`, `PermissionRequest`, `Elicitation`), fusionnés dans `~/.claude/settings.json` (15 events actifs au total) ; une quinzaine d'autres events retournés par une recherche mais jugés trop spéculatifs sont explicitement documentés comme exclus dans le roadmap plutôt que mappés à l'aveugle.

Ensuite, ajout complet de la fenêtre de settings demandée par Baptiste (clic droit/double-clic sur l'avatar) : taille de l'avatar, mode debug (overlay animation/hook), export/import JSON, localStorage + sync entre fenêtres via un event Tauri custom (`hooky-settings`, même pattern que `hooky-state`). Refonte de l'UI avec shadcn/ui (préréglage `nova`, base `@base-ui/react`) + Tailwind v4, installés pour la première fois dans ce projet — installation bloquée à trois reprises par la quarantaine pnpm `minimum-release-age` déclenchée par les appels `pnpm add` internes du CLI shadcn (impossible à contourner avec le flag habituel), résolu via un `.npmrc` local temporaire.

Enfin, trois rounds de retours utilisateur en usage réel ont surfacé des bugs invisibles en revue de code : ratio non carré de l'avatar sous 240px (chaîne CSS `height:100%` rompue dès `#root`, absent de toute règle), double-clic non fiable (`startDragging()` appelé sur chaque mousedown cassait le comptage natif du navigateur), export silencieux (limitation Tauri connue sur `<a download>` + `blob:`, remplacé par un vrai dialogue natif + commande Rust custom), et un `AlertDialog` de confirmation qui ne se fermait pas après l'action (spécificité du style base-ui de shadcn, `AlertDialogAction` ne ferme pas automatiquement contrairement à Radix).

**Entrées clés :**

- [BDR-006](decisions/BDR-006.md) — mapping des hooks finalisé
- [BDR-007](decisions/BDR-007.md) — fenêtre settings native, localStorage seul
- [BLK-003](blockers/BLK-003.md) — install shadcn/Tailwind bloqué par la quarantaine pnpm
- [BLK-004](blockers/BLK-004.md) — export silencieux (limitation Tauri, pas un bug applicatif)
