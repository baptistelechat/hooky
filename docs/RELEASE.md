# Release & distribution — Hooky

Checklist v0 partageable. Détail technique de chaque point résumé dans
`ROADMAP.md` (Étape 11). Chaque case cochée doit être re-liée à une entrée
`ROADMAP.md` au moment de l'implémentation (même convention que `EVENTS.md`).

## Checklist

- [x] Icônes custom (tray, app, installeur)
- [x] Tray simplifié : `Paramètres` + `Quitter`
- [x] Packaging NSIS (`bundle.targets: ["nsis"]`, `installMode: "currentUser"`)
- [x] Auto-launch au 1er `SessionStart` si l'app n'est pas déjà lancée
- [x] Commande settings : fusionner `hooks/claude-settings-snippet.json` dans `~/.claude/settings.json`
- [x] Système de mise à jour (check button + check au lancement + badge persistant)
- [x] CI GitHub Actions : build + publish installeur sur tag
- [x] README complet EN/FR (présentation, screenshots pet + settings façon mini-LP, tuto d'installation, disclaimer SmartScreen)
- [x] LICENSE (déjà en place — AGPL-3.0 intégrale, convention GitHub, pas de doublon `.md`)
- [ ] (optionnel) Landing page `hooky.vercel.app`

## 1. Icônes custom ✅

Fait via le générateur intégré au CLI Tauri (`pnpm tauri icon <source>`),
zéro package supplémentaire. Source finale : `src/assets/logo.svg` (vrai
logo Cubee, carré 1024×1024 avec transparence — remplace le placeholder
initial `#6366f1`). Set régénéré dans `src-tauri/icons/` via
`pnpm icons src/assets/logo.svg` (script npm). Pour toute future mise à jour
du logo, relancer la même commande avec la nouvelle source.

> Les assets mobiles générés en trop par le CLI (`android/`, `ios/`,
> `64x64.png` — app Windows-only, aucune cible mobile déclarée) sont
> supprimés après chaque régénération.

## 2. Tray simplifié ✅

`src-tauri/src/lib.rs` : `recenter_item` remplacé par `settings_item`
("Paramètres"), `quit_item` gardé. Le menu tray n'ouvre pas la fenêtre
directement depuis Rust (éviterait de dupliquer la logique
focus/toggle-minimize déjà en JS) — il émet l'event applicatif
`hooky-open-settings`, écouté uniquement par la fenêtre `"main"` (toujours
vivante), qui appelle `openSettingsWindow()` (extrait d'`Avatar.tsx` vers
`src/lib/settingsWindow.ts`, réutilisable sans dupliquer). `recenter_window`
conservée (`#[allow(dead_code)]`) en cas de réintroduction future.

## 3. Packaging NSIS ✅

Fait tel que prévu, dans `src-tauri/tauri.conf.json` :

```json
"bundle": {
  "targets": ["nsis"],
  "windows": {
    "nsis": { "installMode": "currentUser" }
  }
}
```

`currentUser` (pas `perMachine`, le défaut) → install dans
`%LOCALAPPDATA%\Hooky\`, aucune élévation UAC, chemin prévisible et fixe pour
le point 4 (auto-launch).

**SmartScreen** : installeur non signé → écran d'avertissement Windows
("Plus d'infos" → "Exécuter quand même"). Pas de certificat de signature pour
la v0 (coût annuel, disproportionné à ce stade) — à mentionner sur la LP pour
ne pas surprendre au premier téléchargement. À reconsidérer si l'usage
dépasse le cercle proche.

## 4. Auto-launch au 1er SessionStart ✅

Implémenté en inline dans `docs/hooks/claude-settings-snippet.json` (pas de
fichier `.ps1` séparé, contrairement au sketch initial ci-dessous — un script
externe casserait la propriété "portable sans script à copier" déjà
documentée dans `docs/hooks/README.md`, et pose un problème d'œuf-et-poule
tant que Hooky n'est pas encore installé) :

```
powershell -NoProfile -Command "$j=[Console]::In.ReadToEnd(); $j | curl.exe -s -m 5 -X POST http://127.0.0.1:4242/event -H 'Content-Type: application/json' -d @-; if ($LASTEXITCODE -ne 0) { Start-Process ($env:LOCALAPPDATA + '\Hooky\Hooky.exe') }"
```

`$LASTEXITCODE` reflète le code retour de `curl.exe` (dernier exécutable natif
de la pipeline) : `0` sur un POST normal, non-zéro (typiquement `7`,
connexion refusée) si rien n'écoute sur le port 4242 → déclenche
`Start-Process`. Pas de retry immédiat : le prochain event
(`UserPromptSubmit`) sera reçu normalement une fois l'app démarrée.

Chemin `%LOCALAPPDATA%\Hooky\Hooky.exe` dépend directement de
`installMode: "currentUser"` (point 3) — à garder synchronisés.

> ⚠️ Pas encore testé en conditions réelles (nécessite de relancer une session
> Claude Code avec le snippet installé) — à valider avant de considérer ce
> point définitivement clos.

## 5. Commande settings → fusionner les hooks ✅

Fait tel que prévu. Commande Rust `install_claude_hooks` (`lib.rs`, même
pattern que `write_text_file`) : le snippet `docs/hooks/claude-settings-snippet.json`
est embarqué dans le binaire via `include_str!` (pas de lecture disque
fragile côté install), fusionné event par event dans `~/.claude/settings.json`
avec dédup structurelle (idempotent, jamais d'écrasement des hooks
existants), `ReadOnly` désactivé/restauré via `std::fs` (pas de nouvelle
dépendance). Retourne `"installed" | "merged" | "already_up_to_date"`.

Bouton "Installer les hooks Claude Code" dans `src/components/Settings/components/MaintenanceField.tsx`
(nouveau fichier, extrait pour respecter la règle des composants >200
lignes), retour visuel inline par statut — pas de toast (cf. BDR-041, ce
projet n'a volontairement aucune dépendance toast).

## 6. Système de mise à jour ✅

Pas de `tauri-plugin-updater` (écarté comme prévu). Implémenté dans
`src/lib/updateStatus.ts` + `src/hooks/useUpdateStatus.ts` :

- `fetch("https://api.github.com/repos/baptistelechat/hooky/releases/latest")`
  côté front, compare `tag_name` à `getVersion()` (natif, `@tauri-apps/api/app` —
  pas de nouvelle commande Rust nécessaire).
- État partagé cross-fenêtre via localStorage + event Tauri, même contrat que
  `settings.ts`/`useSettings.ts` (pas de store Zustand introduit — ce
  pattern EST déjà le mécanisme d'état partagé du projet, aucune dépendance
  Zustand présente dans `package.json`).
- Bouton "Vérifier les mises à jour" dans `MaintenanceField.tsx`, ouvre
  `html_url` via `@tauri-apps/plugin-opener` (déjà utilisé ailleurs).
- Check silencieux une fois au lancement (`checkForUpdateOnce`, garde
  module-level anti-double-appel StrictMode), déclenché depuis `App.tsx`
  pour la fenêtre `"main"` uniquement.

**Écart vs plan initial** : le badge ne réutilise pas le composant
`AnimationOverlay` (badge des hooks sur le pet) — hors du scope de fichiers
alloué à l'agent, et trop couplé au rendu avatar/hooks pour être
génériquement réutilisable. À la place : un point rouge persistant
(`bg-destructive`, token shadcn existant) sur le bouton "Vérifier les mises
à jour" et sur l'onglet "Réglages" dans `Settings/index.tsx`, piloté par
`useUpdateStatus()`. Fonctionnellement équivalent (indicateur persistant,
ne s'efface pas seul), mais pas au même endroit visuel (settings, pas coin
bas-gauche de la fenêtre principale) — à revoir si ce placement s'avère
peu visible à l'usage.

## 7. CI GitHub Actions ✅

`.github/workflows/release.yml`, action officielle `tauri-apps/tauri-action`.
`runs-on: windows-latest` uniquement (pas de matrice multi-OS, app
Windows-only). Déclenché sur push de tag `v*`, build l'installeur NSIS,
crée une GitHub Release en **draft** (`releaseDraft: true` — contrôle manuel
avant publication, à ajuster si publication directe préférée). Condition pour
que le point 6 ait quelque chose à checker. Pas encore testé en réel (aucun
tag poussé).

## 8. Landing page (optionnel)

`hooky.vercel.app` déjà retenu dans `BRIEF.md`. Statique, présente le
concept + lien de téléchargement vers la dernière release GitHub. Alternative
zéro-coût : GitHub Pages — mais Vercel déjà nommé et cohérent avec le stack
préféré, pas de raison de changer sans contrainte nouvelle.
