# Installation des hooks Claude Code pour Hooky

`claude-settings-snippet.json` déclare les hooks qui font vivre Hooky : chaque event
Claude Code listé y est POST sur `http://127.0.0.1:4242/event`, le port fixe du serveur
axum embarqué dans l'app Tauri.

> **Cas particulier `SessionStart`** : depuis Claude Code v2.1.51, les hooks de type
> `"http"` ne sont pas supportés sur `SessionStart` (ni `Setup`) — restriction de
> sécurité non documentée officiellement ([issue #28044](https://github.com/anthropics/claude-code/issues/28044)).
> La requête ne part jamais, silencieusement, sans erreur visible. Le snippet utilise
> donc un hook `"command"` qui pipe le JSON du hook (stdin) vers `curl` à la place —
> `curl` est préinstallé sur Windows 10+/macOS/Linux, donc ça reste portable sans
> script à copier en plus. Tous les autres events du snippet restent en `"http"`
> natif, qui fonctionne normalement partout ailleurs.

## 1. Fusionner le snippet dans `settings.json`

Deux emplacements possibles :

- **Global** (recommandé, Hooky réagit à toutes tes sessions) : `~/.claude/settings.json`
- **Projet** (portée limitée à un repo) : `.claude/settings.json` à la racine du projet

Si ce fichier **n'existe pas encore** ou n'a pas de clé `"hooks"` : copie tout le
contenu de `claude-settings-snippet.json` tel quel dedans.

Si une clé `"hooks"` **existe déjà** (d'autres hooks configurés) : **ne remplace pas
le bloc entier** — fusionne clé par clé. Pour chaque event du snippet (`SessionStart`,
`UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `Notification`,
`Stop`, `SessionEnd`, `StopFailure`, `SubagentStart`, `SubagentStop`, `PreCompact`,
`PostCompact`, `PermissionRequest`, `Elicitation`) :

- Si l'event n'existe pas encore dans ton `settings.json` → ajoute son tableau tel quel.
- Si l'event existe déjà (ex. tu as déjà un hook `PreToolUse` pour autre chose) →
  ajoute l'entrée `{ "hooks": [{ "type": "http", ... }] }` du snippet dans le tableau
  existant, ne l'écrase pas.

Fais-le à la main ou avec un outil JSON de ton choix (VS Code, `jq`, etc.) — pas de
script de merge automatique fourni ici, ça reste une opération ponctuelle à
l'installation.

## 2. Port 4242 fixe

Le port est codé en dur côté serveur Rust (`src-tauri`), aucun fallback dynamique. Si
un autre process occupe déjà le port 4242 sur ta machine, l'app Hooky ne démarrera pas
(message d'erreur clair côté app plutôt qu'un silencieux échec). Libère le port ou
ferme l'autre process avant de relancer Hooky.

## 3. Comportement si Hooky n'est pas lancé

Rien à faire de spécial. Un hook `type: "http"` qui échoue (app fermée, port injoignable)
est traité par Claude Code comme une erreur **non-bloquante** : pas de crash, pas de
blocage de la session CLI, la requête échoue silencieusement. Tu peux donc laisser ces
hooks actifs en permanence et ne lancer Hooky que quand tu veux voir le pet réagir.

## 4. Test manuel

Une fois l'app Hooky lancée, vérifie que le serveur répond :

```bash
curl -X POST http://127.0.0.1:4242/event -H "Content-Type: application/json" -d "{\"hook_event_name\":\"Notification\",\"session_id\":\"test\"}"
```

Une réponse `ok` (ou équivalent) confirme que le serveur écoute bien avant de brancher
une vraie session Claude Code dessus.
