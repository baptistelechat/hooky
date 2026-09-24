# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this
project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.3.0] - 2026-09-24

### Added

- Codex pets: any pet installed in `~/.codex/pets` now shows up in a new "Pets Codex"
  section of the Avatar tab in the settings (install one with
  `npx petdex install <name>`). Pick one and it becomes your desktop pet, animated from its
  spritesheet and following what Claude Code is doing, with the status badge colored after
  the pet's own colors. A Codex pet waves when a session starts, when a login succeeds or
  when Claude Code resumes after a quota pause, and the Animation tab shows which
  spritesheet row each hook plays. A Codex pet also runs left or right while you drag it,
  and dozes off (slower) when no session is active. If a pet's image goes missing
  or can't be read, Hooky falls back to Cubee instead of showing an invisible pet
- "Aucune session" card in the Animation tab, to preview the sleeping state even while real sessions are open
- "Télécharger sur Petdex" button next to the Codex pets, to browse and download new ones
- Newer Codex pets (v2 spritesheets) now look at your cursor while they sleep: come close and they wake up and follow it, move away and they doze off again after a moment. These pets get an eye icon on their card in the Avatar tab

### Changed

- The Avatar tab now has an "Avatars" title for the built-in skins, with its own
  "Créer ou télécharger" button, matching the new "Pets Codex" section
- The settings window is taller, so the pet grids get more room
- A little more space between the pet and the quota rings

### Fixed

- When the local Claude Code login itself has expired (not just the short-lived token),
  the quota rings now show "Reconnexion requise" telling you to run `claude auth login`,
  instead of a generic "unavailable" message that never went away
- Hooky now auto-launches on Claude Code startup wherever it is installed (e.g. `D:\`),
  instead of only from the default `%LOCALAPPDATA%\Hooky` folder. Click "Installer les
  hooks" in the settings once to update your existing hook

## [0.2.2] - 2026-09-12

### Fixed

- Quota rings no longer get stuck on "Loading…" indefinitely when the local Claude Code
  auth token has expired -- it's now refreshed automatically, and an "unavailable" message
  appears instead if fetching still fails after retries
- The safety margin keeping the avatar off screen edges while dragging was inconsistent --
  much smaller near the taskbar than on the other sides -- now uses the real usable screen
  area on every monitor, so the margin stays even on all sides

## [0.2.1] - 2026-09-11

### Fixed

- Quota rings no longer get stuck on "Loading…" when Anthropic's usage endpoint is
  temporarily rate-limited -- the panel keeps showing the last known values and retries
  with increasing delays instead of hammering the endpoint

## [0.2.0] - 2026-09-11

### Added

- Permanent Claude Code quota rings below the avatar (session, weekly, per-model),
  color-coded by usage level, with the exact percentage and time remaining before reset
  shown on hover -- toggleable in Settings

### Changed

- "Mode debug" moved to the bottom of the Settings list
- Session and Fable quota rings now show a dedicated icon instead of a text glyph

### Fixed

- Increased the screen-edge drag safety margin so the avatar (and its quota rings) no
  longer end up hidden behind the taskbar when dragged to the bottom of the screen

## [0.1.0] - 2026-09-05

### Added

- Desktop pet reacting in real time to Claude Code CLI hooks (`SessionStart`, `PreToolUse`,
  `Notification`, `Stop`, ...)
- Custom app/tray/installer icons generated from the Cubee mascot
- NSIS installer (`currentUser` mode, no admin prompt)
- Auto-launch on the first `SessionStart` hook if Hooky isn't already running
- In-app button to install the Claude Code hooks into `~/.claude/settings.json`
- Update check (manual button, silent check on launch, persistent indicator)
- GitHub Actions release pipeline building and publishing the Windows installer on tag push

[Unreleased]: https://github.com/baptistelechat/hooky/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/baptistelechat/hooky/releases/tag/v0.3.0
[0.2.2]: https://github.com/baptistelechat/hooky/releases/tag/v0.2.2
[0.2.1]: https://github.com/baptistelechat/hooky/releases/tag/v0.2.1
[0.2.0]: https://github.com/baptistelechat/hooky/releases/tag/v0.2.0
[0.1.0]: https://github.com/baptistelechat/hooky/releases/tag/v0.1.0
