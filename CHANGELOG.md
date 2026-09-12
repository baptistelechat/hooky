# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this
project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/baptistelechat/hooky/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/baptistelechat/hooky/releases/tag/v0.2.1
[0.2.0]: https://github.com/baptistelechat/hooky/releases/tag/v0.2.0
[0.1.0]: https://github.com/baptistelechat/hooky/releases/tag/v0.1.0
