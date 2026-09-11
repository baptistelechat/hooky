# Faire une release — checklist répétable

À suivre dans l'ordre à chaque nouvelle version. Détail technique complet
dans [BDR-067](../.claude/memory/decisions/BDR-067.md) et
[BDR-068](../.claude/memory/decisions/BDR-068.md).

## 1. Vérifier que tout est prêt

- [ ] `git status` propre sur `development`
- [ ] `CHANGELOG.md` → section `## [Unreleased]` non vide (sinon le bump est
      bloqué automatiquement)

## 2. Générer la description de la fusion

```
/pr-description-writer main development
```

Sert de message de merge commit (pas de PR GitHub pour ce repo, merge direct).

## 3. Merger `development` → `main`

**Ligne de commande** — la première ligne du `-m` devient le titre du merge
commit (répéter `-m` pour ajouter un corps). Titre et contenu libres — le
bloc 3 (titre + résumé court plutôt que tout le markdown) n'est qu'une
suggestion de lisibilité, `git log` n'interprète pas les `##`/tableaux :

```bash
git checkout main
git merge development \
  -m "<titre au choix>" \
  -m "<corps au choix>"
git push
```

**Ou via SourceGit** (recommandé, plus simple qu'un `-m` en ligne de commande
multi-lignes) :

1. Checkout `main`
2. Panneau de gauche → clic droit sur **`development`** → **"Fusionner
   development dans main..."**
3. Cocher **"Personnaliser le message de fusion"** → OK
4. Dans l'éditeur qui s'ouvre : titre + corps au choix (idem, le bloc 3 en
   entier fonctionne très bien si tu préfères garder toute la description
   dans l'historique)
5. Pousser (`Pousser development` en haut du même menu, ou bouton push
   général une fois sur `main`)

> ⚠️ Pas encore testé de bout en bout (bump + tag + CI après un merge fait
> ainsi) — à valider à la prochaine release.

**Ou via une PR GitHub** — "Créer une PR pour l'upstream
origin/development..." dans le même menu (SourceGit gère la création de PR
GitHub/GitLab/Gitea/Gitee/Bitbucket directement depuis le client). Coller le
titre + le bloc 1 (FR) ou 2 (EN) rendu de l'étape 2 dans la description.

## 4. Bumper la version

Depuis `main`, choisir le bump selon [SemVer](https://semver.org/) :

```bash
pnpm release:patch   # 0.2.0 -> 0.2.1 (fix)
pnpm release:minor   # 0.2.0 -> 0.3.0 (feature)
pnpm release:major   # 0.2.0 -> 1.0.0 (breaking)
```

Fait automatiquement (hook `"version"` de `pnpm version`) :

- sync `package.json` / `tauri.conf.json` / `Cargo.toml` / `Cargo.lock`
- bascule `## [Unreleased]` → `## [X.Y.Z] - date` dans `CHANGELOG.md`
- commit + tag `vX.Y.Z`

## 5. Pousser le tag

```bash
git push --follow-tags
```

Déclenche `.github/workflows/release.yml` : build NSIS + création d'une
**GitHub Release en draft**.

## 6. Publier

Vérifier la draft sur GitHub (fichiers attachés, notes de version) puis la
publier manuellement.

## 7. Purger les branches mergées

```powershell
git fetch --prune
git branch --merged main | Where-Object { $_ -notmatch '^\*|main|development' } | ForEach-Object { git branch -d $_.Trim() }
```

Supprime les branches de feature locales déjà mergées dans `main` (ne touche
jamais `main`/`development`). `git fetch --prune` nettoie aussi les
références locales vers des branches distantes déjà supprimées sur GitHub.

`development` est exclue du grep car elle sera _toujours_ listée comme
mergée dans `main` après une release (c'est le but) — mais c'est une branche
permanente, pas une feature branch à supprimer.

## 8. Resynchroniser `development` sur `main`

```bash
git checkout development
git merge main --ff-only
git push
```

`development` étant un ancêtre strict de `main` (issu de son merge), le
fast-forward marche toujours, sans conflit. Pas besoin de supprimer/recréer
la branche.
