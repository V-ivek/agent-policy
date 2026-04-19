# Changelog

All notable changes to this project are documented here. Format: [Keep a Changelog](https://keepachangelog.com/). Versioning: [SemVer](https://semver.org/).

## [Unreleased]

## [0.1.0] — 2026-04-18

### Added
- Canonical `agent-policy.yaml` schema (v1) with Ajv 2020-12 validation.
- CLI commands: `init`, `validate`, `render`, `sync`, `sync --check`, `check-commit`, `install-hooks`.
- Renderers: `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md` with `concise` filtering.
- Generated banner with 16-char SHA-256 hash prefix of rendered body.
- `commit-msg` hook that enforces `Assisted-by:` attribution (agent:model or `n/a`).
- Multi-footer support for multi-vendor commits.
- `47nation` Claude Code plugin: 4 slash commands, 1 skill, provisional marketplace manifest. Published as `@47nation/agent-policy` on npm.
- Docs: getting started, configuration, commands, renderers, commit attribution, Claude Code integration, roadmap.
- Examples: minimal and full with generated outputs.
- CI on Node 20 and 22.
