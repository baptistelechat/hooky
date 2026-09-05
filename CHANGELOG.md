# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this
project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/baptistelechat/hooky/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/baptistelechat/hooky/releases/tag/v0.1.0
