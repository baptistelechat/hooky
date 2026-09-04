# Release & distribution — Hooky

Checklist v0 partageable. Détail technique de chaque point résumé dans
`ROADMAP.md` (Étape 11). Chaque case cochée doit être re-liée à une entrée
`ROADMAP.md` au moment de l'implémentation (même convention que `EVENTS.md`).

## Checklist

- [ ] Icônes custom (tray, app, installeur)
- [ ] Tray simplifié : `Paramètres` + `Quitter`
- [ ] Packaging NSIS (`bundle.targets: ["nsis"]`, `installMode: "currentUser"`)
- [ ] Auto-launch au 1er `SessionStart` si l'app n'est pas déjà lancée
- [ ] Commande settings : fusionner `hooks/claude-settings-snippet.json` dans `~/.claude/settings.json`
- [ ] Système de mise à jour (check button + check au lancement + badge persistant)
- [ ] CI GitHub Actions : build + publish installeur sur tag
- [x] README complet EN/FR (présentation, screenshots pet + settings façon mini-LP, tuto d'installation, disclaimer SmartScreen)
- [x] LICENSE (déjà en place — AGPL-3.0 intégrale, convention GitHub, pas de doublon `.md`)
- [ ] (optionnel) Landing page `hooky.vercel.app`

## 1. Icônes custom

Icônes actuelles = scaffold Tauri par défaut (`src-tauri/icons/`), pas de lien
visuel avec Cubee. Pas besoin de package supplémentaire : le CLI Tauri génère
déjà tout le set (`pnpm tauri icon path/vers/source-1024.png`) — juste fournir
un PNG source haute résolution dérivé de Cubee (export du Studio ou capture
`@bible-strong/avatar-react`).

## 2. Tray simplifié

`src-tauri/src/lib.rs` (`TrayIconBuilder`, ~L513) : remplacer `recenter_item`
par `settings_item` (ouvre la fenêtre settings, même code que le
double-clic — cf. Étape 10) ; garder `quit_item`. Diff minimal, pas de nouvelle
dépendance.

## 3. Packaging NSIS

`src-tauri/tauri.conf.json` :

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

## 4. Auto-launch au 1er SessionStart

Étend le hook `SessionStart` existant (`command` + `curl`, cf. BDR-010/GLRN-255
— les hooks `http` ne partent pas sur `SessionStart`) : essayer le POST vers
`127.0.0.1:4242/event` d'abord, et si la connexion échoue (app pas lancée),
lancer l'exe avant de réessayer.

```powershell
# docs/hooks/session-start.ps1 (extension du hook existant)
$json = [Console]::In.ReadToEnd()
try {
    Invoke-RestMethod -Uri "http://127.0.0.1:4242/event" -Method Post `
        -Body $json -ContentType "application/json" -TimeoutSec 1 | Out-Null
} catch {
    Start-Process "$env:LOCALAPPDATA\Hooky\Hooky.exe"
    # pas de retry immédiat : l'app met un instant à démarrer + bind le port,
    # le prochain event (UserPromptSubmit) sera reçu normalement.
}
```

Chemin `%LOCALAPPDATA%\Hooky\Hooky.exe` dépend directement de
`installMode: "currentUser"` (point 3) — à garder synchronisés.

## 5. Commande settings → fusionner les hooks

Aujourd'hui fait à la main par Baptiste (cf. ROADMAP, étape "Fusionner
`claude-settings-snippet.json`") — attribut `ReadOnly` du fichier
`~/.claude/settings.json` désactivé temporairement, JSON mergé, `ReadOnly`
restauré. À reproduire en bouton dans `SettingsPanel` :

- Commande Rust applicative (`invoke_handler`, pas de plugin `fs` — même
  pattern que `write_text_file`, Étape 10) : lit `~/.claude/settings.json`,
  merge les blocks `hooks/claude-settings-snippet.json` (skip si déjà
  présents — idempotent), réécrit, respecte l'attribut `ReadOnly` (le
  désactive le temps de l'écriture, le restaure après).
- Bouton "Installer les hooks Claude Code" dans `SettingsPanel`, retour
  visuel (succès / déjà installé / erreur).

## 6. Système de mise à jour

Pas le plugin `tauri-plugin-updater` officiel (signature ECDSA par build +
`latest.json` à maintenir manuellement — disproportionné : ici on ne fait pas
d'install silencieuse, juste rediriger vers la page de release). À la place :

- `fetch("https://api.github.com/repos/baptistelechat/hooky/releases/latest")`
  côté front (natif, pas d'Axios) → compare `tag_name` à la version courante
  (`package.json`/`tauri.conf.json`, exposée au front via une commande Rust ou
  une constante buildée).
- Bouton "Vérifier les mises à jour" dans `SettingsPanel` (appelle la même
  fonction, ouvre `html_url` de la release si nouvelle version).
- Check silencieux au lancement (une fois, pas de polling) → si outdated,
  state partagé (Zustand ou event Tauri, même pattern que `hooky-settings`)
  déclenche un badge.
- Badge : réutilise le système de badge/icône déjà existant (BDR-015/020/023)
  — variante persistante coin bas-gauche de la fenêtre principale, reste tant
  que la version n'est pas à jour (contrairement aux badges hooks qui
  s'effacent).

## 7. CI GitHub Actions

`.github/workflows/release.yml`, action officielle
`tauri-apps/tauri-action` (zéro script de build custom à maintenir) :
déclenchée sur push de tag `v*`, build l'installeur NSIS, crée/attache à une
GitHub Release. Condition pour que le point 6 ait quelque chose à checker.

## 8. Landing page (optionnel)

`hooky.vercel.app` déjà retenu dans `BRIEF.md`. Statique, présente le
concept + lien de téléchargement vers la dernière release GitHub. Alternative
zéro-coût : GitHub Pages — mais Vercel déjà nommé et cohérent avec le stack
préféré, pas de raison de changer sans contrainte nouvelle.
