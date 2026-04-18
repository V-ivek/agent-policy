# agent-policy v0.1 — implementation summary

Date: 2026-04-18
Branch: `feat/v0.1` (32 checkpoint commits, to be squashed)
Source plan: [`2026-04-17-agent-policy-implementation.md`](./2026-04-17-agent-policy-implementation.md)

## What was built

### CLI (all 6 commands operational)

| Command | File |
|---|---|
| `init` | `src/commands/init.ts` |
| `validate` | `src/commands/validate.ts` |
| `render [--renderer <id>]` | `src/commands/render.ts` |
| `sync [--force]` | `src/commands/sync.ts` |
| `sync --check` | `src/commands/sync.ts` (shared module) |
| `check-commit <file\|->` | `src/commands/check-commit.ts` |
| `install-hooks [--force]` | `src/commands/install-hooks.ts` |

### Core modules

- `src/config/types.ts` — TypeScript model of the config.
- `src/config/load.ts` — YAML parsing + upward `findConfigFile`.
- `src/config/schema.ts` — Ajv 2020-12 validator with friendly error formatting and unique-id check.
- `src/renderers/common.ts` — banner + SHA-256 hash utilities.
- `src/renderers/compose.ts` — `Renderer` interface, section filtering, attribution composer.
- `src/renderers/{agents-md,claude-md,copilot}.ts` — three renderers.
- `src/renderers/index.ts` — registry + `getEnabledRenderers`.
- `src/io/fs.ts` — banner-guarded filesystem writes.
- `src/io/commit.ts` — git-trailer extractor.
- `src/io/git.ts` — hooks-dir resolution via `git rev-parse --git-path hooks`.

### `47nation` Claude Code plugin

- `integrations/claude-code/47nation/.claude-plugin/plugin.json` — manifest.
- `commands/{init,sync,check,render}.md` — 4 slash commands with scoped `allowed-tools`.
- `skills/following-agent-policy/SKILL.md` — teaches Claude the attribution convention.
- `marketplace/marketplace.json` — provisional publisher manifest.

### Docs + examples

- `README.md` — install, quick-start, example config, example output, command table.
- 7 `docs/` pages (getting-started, configuration, commands, renderers, commit-attribution, claude-code-integration, roadmap).
- `examples/minimal/` and `examples/full/` with generated outputs checked in.
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`.
- `.github/` issue + PR templates.

### CI and release

- `.github/workflows/ci.yml` — Node 20 + 22 matrix; lint, typecheck, test, build, end-to-end `sync --check` smoke on `examples/full`.
- `.github/workflows/release.yml` — tag-triggered npm publish + GitHub Release.

## Test and verification

- **68 tests** across 16 files (config, renderers, all commands, determinism, hook install with real git).
- `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` — all green.
- `node dist/cli.js sync --check` on `examples/full/` — passes.
- `npm pack --dry-run`: ships 6 files (dist + schemas + LICENSE + README + package.json). No src, tests, docs, or examples in the tarball.

## Architecture decisions (from design doc)

- **TS on Node 20+**: `npx` reach, first-class YAML + JSON Schema, aligns with Claude Code plugin runtime.
- **Pure core + I/O edges**: `config/` and `renderers/` are pure. All FS and git touch live in `commands/` + `io/`.
- **Inclusion-list for section targeting**: each `policy.sections[].renderers[]` is an explicit include-list; `pinned: true` overrides `concise`.
- **Banner + hash**: every generated file carries `<!-- agent-policy:hash=... -->`; `sync` refuses to overwrite unbannered files; `sync --check` uses byte-equality.
- **Strict attribution default**, with `Assisted-by: n/a` as the accepted human marker; multi-footer allowed (`allow_multiple: true`).
- **Scoped npm package**: `@47nation/agent-policy` — publisher consistency with the marketplace slug and plugin directory.

## Divergences from the plan

- **Task 5.2** (`sync --check`) was folded into `src/commands/sync.ts` alongside `runSync` rather than appended later. Both share the same `loadAndValidate` helper. Cleaner, no behavior change.
- **Renderer helpers** moved to `src/renderers/compose.ts` instead of living in `index.ts`, to avoid circular imports between the registry and the renderer implementations.
- **`CODE_OF_CONDUCT.md`** references the Contributor Covenant canonical URL instead of reproducing it verbatim. Equivalent adoption pattern, smaller diff.
- **`npm install`** (not `npm ci`) used for initial setup since there was no prior lockfile.

## Known limitations

- **v0.1 only enforces `Assisted-by:`** — no Conventional Commit validation, no checkpoint-subject format validation, no Signed-off-by. See `docs/roadmap.md`.
- **Marketplace manifest is provisional** — `47nation` is not registered on any Claude Code plugin marketplace yet; the file is a template.
- **No `agent-policy schema` export command** — deferred to v0.2. Schema is available at `schemas/agent-policy.schema.json`.
- **`check-commit` does not enforce Conventional Commit subjects** — deferred.
- **npm audit** reports 4 moderate vulns in transitive dev dependencies (eslint 8 + old glob). None in runtime deps. Acceptable for 0.1; revisit before 1.0.

## Commit identity

The 32 checkpoint commits on `feat/v0.1` were made under two identities (local repo config was switched mid-session from `vivek-baraka` to `V-ivek <agent47vivek@gmail.com>`). The final squash will consolidate them into a single commit authored by `V-ivek <agent47vivek@gmail.com>`.

## How to use

```sh
# Install
npm install -g @47nation/agent-policy

# In a repo
agent-policy init
# edit agent-policy.yaml
agent-policy sync
agent-policy install-hooks
git commit -m "feat: use agent-policy

Assisted-by: claude:opus-4-7"
```

## Exact commands to publish

### 1. Squash the 32 checkpoint commits into a final commit

```sh
cd /Users/vivek-baraka/Development/agent-policy
git checkout feat/v0.1

# Base is the last commit on main before this branch diverged.
BASE=$(git merge-base main feat/v0.1)
echo "Base: $BASE"
git log --oneline "$BASE"..HEAD   # sanity-check the 32 commits are all checkpoints

# Soft-reset to base, then create one squashed commit.
git reset --soft "$BASE"
git commit -m "feat: initial agent-policy v0.1 release

Ships the agent-policy CLI (init, validate, render, sync, sync --check,
check-commit, install-hooks), three renderers (AGENTS.md, CLAUDE.md,
.github/copilot-instructions.md) with concise filtering and banner+hash
guard, and a commit-msg hook that enforces Assisted-by attribution.

Includes the 47nation Claude Code plugin (4 slash commands + skill),
provisional marketplace manifest, full docs, minimal and full examples
with generated outputs, CI on Node 20/22, and a tag-triggered release
workflow for npm publishing.

Assisted-by: claude:opus-4-7"
```

### 2. Push to GitHub (`V-ivek/agent-policy`)

```sh
# Create the remote repo on GitHub first (via web UI), then:
git remote add origin git@github.com:V-ivek/agent-policy.git

# Push main (empty) first so the default branch exists:
git checkout main
git push -u origin main

# Push the feature branch:
git checkout feat/v0.1
git push -u origin feat/v0.1

# Open a PR:
gh pr create \\
  --base main \\
  --head feat/v0.1 \\
  --title "feat: initial agent-policy v0.1 release" \\
  --body "See docs/plans/2026-04-17-agent-policy-summary.md for the full rundown."
```

### 3. Publish to npm (after PR merge)

```sh
git checkout main
git pull
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
# The release workflow at .github/workflows/release.yml will publish to npm.
```

Requires `NPM_TOKEN` secret configured on the GitHub repo.

## What's next

See `docs/roadmap.md` for the v0.2 candidate list.
