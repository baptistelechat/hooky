<h1 align="center">Hooky 🐾</h1>

<p align="center">
  <b>Un mini pet de bureau qui réagit en temps réel aux hooks de Claude Code.</b><br>
  <i>Hooky ne voit jamais ton code — seulement les events, comme des impulsions nerveuses.</i>
</p>

<p align="center">
  <a href="README.md">🇬🇧 Read in English</a>
</p>

![License](https://shieldcn.dev/github/license/baptistelechat/hooky.svg)
![Platform](https://shieldcn.dev/badge/platform-Windows-0078D6.svg)
![Built with Tauri](https://shieldcn.dev/badge/built%20with-Tauri-24C8DB.svg)

---

## 📸 Aperçu

### Voici Cubee

<p align="center">
  <img src="docs/assets/pet-listening.png" width="110" alt="listening" />
  <img src="docs/assets/pet-thinking.png" width="110" alt="thinking" />
  <img src="docs/assets/pet-searching.png" width="110" alt="searching" />
  <img src="docs/assets/pet-working.png" width="110" alt="working" />
  <img src="docs/assets/pet-confused.png" width="110" alt="confused" />
  <img src="docs/assets/pet-celebrate.png" width="110" alt="celebrate" />
</p>
<p align="center"><sub>listening · thinking · searching · working · confused · celebrate</sub></p>

### Choisis ton skin

<p align="center">
  <img src="docs/assets/pet-skin-freddy.png" width="110" alt="Skin Freddy" />
  <img src="docs/assets/pet-skin-kirby.png" width="110" alt="Skin Kirby" />
  <img src="docs/assets/pet-skin-nova.png" width="110" alt="Skin Nova" />
  <img src="docs/assets/pet-skin-sunee.png" width="110" alt="Skin Sunee" />
</p>
<p align="center"><sub>10+ skins intégrés, interchangeables à tout moment dans Paramètres → Avatar</sub></p>

### Paramètres

<p align="center">
  <img src="docs/assets/settings-avatar.png" width="270" alt="Choix de l'avatar" />
  <img src="docs/assets/settings-reglages.png" width="270" alt="Réglages" />
  <img src="docs/assets/settings-animation.png" width="270" alt="Grille de validation des animations" />
</p>

## 🚀 Fonctionnalités clés

- **Réactions en temps réel** : `SessionStart`, `PreToolUse`, `Notification`, `Stop`... chaque hook Claude Code déclenche une animation correspondante, en direct.
- **Zéro accès au code** : Hooky reçoit uniquement les payloads d'events via un serveur HTTP local — elle ne touche jamais à tes fichiers ni à tes prompts.
- **10+ skins interchangeables** : choisis Cubee, Freddy, Kirby, Nova, Sunee et bien d'autres depuis les Paramètres, chacun avec ses propres couleurs personnalisables.
- **Bulles de notification** : une bulle de texte apparaît à côté de l'avatar quand Claude a besoin de toi ou vient de terminer.
- **Installation des hooks en un clic** : fusionne la config nécessaire dans `~/.claude/settings.json` sans toucher à tes hooks existants.
- **Badge de mise à jour** : un petit badge apparaît sur l'avatar quand une nouvelle version est disponible — pas d'auto-update silencieux.

## 💻 Stack technique

| Catégorie     | Technologies                                                                                                                                                                         |
| :------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**  | ![Vite](https://shieldcn.dev/badge/Vite-7-purple.svg) ![React](https://shieldcn.dev/badge/React-19-blue.svg) ![Tailwind](https://shieldcn.dev/badge/Tailwind-4-cyan.svg) `shadcn/ui` |
| **Backend**   | ![Tauri](https://shieldcn.dev/badge/Tauri-v2-24C8DB.svg) `axum` + `tokio` — serveur HTTP local (`127.0.0.1:4242`) qui reçoit les hooks et les relaie au frontend                     |
| **Animation** | [`@bible-strong/avatar-react`](https://github.com/smontlouis/bible-strong-avatar-lab) — moteur SVG procédural, aucune librairie d'animation externe                                  |

## 📦 Installation

1. Télécharge le dernier installeur (`Hooky_x.y.z_x64-setup.exe`) depuis la [page Releases](https://github.com/baptistelechat/hooky/releases/latest).
2. Lance l'installeur.

   > ⚠️ **Windows va afficher "Windows a protégé votre ordinateur"** (SmartScreen). C'est normal : l'installeur n'est pas signé par un certificat payant. Le code est open-source et consultable dans ce repo. Clique sur **"Informations complémentaires"** puis **"Exécuter quand même"** pour continuer.

3. Une fois installée, Hooky se lance et se réduit dans le tray.
4. Ouvre les **Paramètres** (clic droit sur l'icône du tray, ou double-clic sur l'avatar) et clique sur **"Installer les hooks Claude Code"** — ça fusionne la config nécessaire dans `~/.claude/settings.json` sans toucher à tes hooks existants.

Hooky reste endormie tant qu'aucune session Claude Code n'est active, et se relance automatiquement au prochain `SessionStart` si tu l'as fermée.

## ⬆️ Mises à jour

Un badge apparaît sur l'avatar quand une nouvelle version est disponible (check au lancement + bouton "Vérifier les mises à jour" dans les Paramètres). La mise à jour se fait en retéléchargeant l'installeur depuis la page Releases — pas d'auto-update silencieux.

## 🧠 États

Liste complète des events Claude Code écoutés et de leur animation associée : [`docs/EVENTS.md`](docs/EVENTS.md).

## 🛠️ Développement

Assure-toi d'avoir **Node.js** et **PNPM** installés.

1. **Clone le projet**

   ```bash
   git clone https://github.com/baptistelechat/hooky.git
   cd hooky
   ```

2. **Installe les dépendances**

   ```bash
   pnpm install
   ```

3. **Lance l'app en dev**

   ```bash
   pnpm tauri:dev    # hot reload front + backend
   ```

4. **Build l'installeur**

   ```bash
   pnpm tauri:build
   ```

Autres scripts utiles : `pnpm lint`, `pnpm typecheck`.

Détails d'architecture, décisions techniques et suivi d'avancement : [`docs/BRIEF.md`](docs/BRIEF.md) et [`docs/ROADMAP.md`](docs/ROADMAP.md).

---

## 😸 Mainteneur

Fait avec ❤️ par [Baptiste LECHAT](https://github.com/baptistelechat)

## 📝 Licence

Ce projet est sous licence [AGPL-3.0](LICENSE). Le moteur d'animation est copié depuis [`smontlouis/bible-strong-avatar-lab`](https://github.com/smontlouis/bible-strong-avatar-lab) (AGPL-3.0) — l'ensemble du repo est donc sous la même licence, code source complet inclus.
