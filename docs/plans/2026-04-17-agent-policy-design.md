# agent-policy — design

Status: approved
Date: 2026-04-17
Author: Vivek (with Claude Opus 4.7)
Source prompt: [`docs/prompts/agent-policy-genesis-prompt.md`](../prompts/agent-policy-genesis-prompt.md)

## 1. Purpose

`agent-policy` is a vendor-neutral CLI that keeps AI coding-agent repository instruction files in sync from a single source of truth and enforces a standard commit-attribution footer. It ships with a companion Claude Code plugin, `agent47`, that makes the tool easy to drive from a Claude Code session.

The product solves two concrete problems:

1. AI coding tools read different instruction files (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, and more over time). Maintainers need one canonical file and deterministic generation of the rest.
2. When AI assists with commits, attribution is inconsistent or missing. The tool enforces a single, auditable `Assisted-by:` footer convention via a git `commit-msg` hook.

## 2. Decisions (confirmed)

| Decision | Choice | Rationale |
|---|---|---|
| Language / runtime | **TypeScript on Node.js 20+** | `npx` install, first-class YAML + JSON Schema tooling, native ecosystem fit with Claude Code plugins. |
| Scope for v0.1 | **Tight MVP + `sync --check` + multiple `Assisted-by` footers** | `sync --check` is load-bearing for CI enforcement; multi-footer supports the multi-vendor premise. |
| `agent47` shape | **Real Claude Code plugin + provisional marketplace manifest** | The user is a plugin author; templates-only would be a half-measure. Marketplace file is scaffolded and marked provisional until the namespace is owned. |
| Attribution strictness | **Strict default; `Assisted-by: n/a` accepted for human-only commits** | Fully auditable history with a low-ceremony escape hatch for trivial commits. |
| Package naming | **npm `@agent47/agent-policy`, CLI bin `agent-policy`, plugin slug `agent47/agent-policy`** | Publisher namespace consistency across npm, plugin, and marketplace. |
| GitHub repo | **`github.com/V-ivek/agent-policy`** | Owned by the user's personal GitHub account. `agent47` is a publisher identity, not a GitHub org. |
| License | **MIT** | Already in repo; minimal friction. |

## 3. Architecture

One Node package, clean separation between config, rendering, and I/O.

```
┌─ commands/           (init, validate, render, sync, check-commit, install-hooks)
│       │
│       ▼
├─ config/             (YAML loader + Ajv schema validator + typed model)
│       │
│       ▼
├─ renderers/          (AgentsMd, ClaudeMd, Copilot — pluggable via a common interface)
│       │
│       ▼
└─ io/                 (filesystem with generated-banner guard, git hook install, commit-msg parser)
```

Properties:

- **Pure core.** `config/` and `renderers/` are pure functions. Config in, strings out. No filesystem access in their tests.
- **I/O at the edges.** `commands/` is the only layer allowed to touch disk or spawn git.
- **Pluggable renderer interface.** `{ id, defaultPath, concise?, render(policy, options) → string }`. Adding a fourth renderer (e.g., Cursor Rules) is one file + one config key + one schema entry.
- **`sync --check` has no parallel implementation.** It renders in memory and diffs against disk.

### Stack

- Node 20+ LTS, ESM, TypeScript strict mode.
- CLI: `commander`.
- YAML: `yaml` (preserves positions for good error messages).
- Schema: `ajv` + `ajv-formats`, canonical JSON Schema at `schemas/agent-policy.schema.json`.
- Tests: `vitest` with inline snapshots.
- Lint/format: `eslint` + `prettier`.
- Build: `tsup` → bundled `dist/cli.js` with a shebang.

## 4. Config schema

```yaml
version: 1

project:
  name: my-repo
  description: "Short one-liner included in generated files."

policy:
  sections:
    - id: overview
      title: Project overview
      body: |
        This repo does X. Architecture is Y.
      # omitted `renderers` => included by all renderers
    - id: conventions
      title: Coding conventions
      body: |
        - Prefer small modules.
        - Tests alongside source.
    - id: detailed-workflow
      title: Detailed workflow
      body: |
        (long-form content)
      renderers: [agents_md]   # full version only

attribution:
  assisted_by:
    required: true
    format: "Assisted-by: {agent}:{model}"
    human_marker: "Assisted-by: n/a"
    allow_multiple: true

renderers:
  agents_md:
    enabled: true
    path: "AGENTS.md"
  claude_md:
    enabled: true
    path: "CLAUDE.md"
    concise: true
  copilot_instructions:
    enabled: true
    path: ".github/copilot-instructions.md"
    concise: true

task_policy:
  commit_on_task_completion: true
  allow_checkpoint_commits: true
  require_user_prompt_for_squash: true

checkpoint_commit:
  enabled: true
  subject_format: "checkpoint(task={task_id}, seq={seq}, agent={agent}, model={model}, ts={ts}): {summary}"
  run_precommit: false

final_commit:
  conventional_commits: true
  run_precommit: true
  required_footers: ["Assisted-by"]
```

Notes:

- `version: 1` is mandatory and pinned. Schema changes go through a migration path, never a silent break.
- `renderers` on a section is an **inclusion list**. Explicit beats implicit.
- `concise: true` on a renderer makes it emit only sections that list it explicitly (plus any `pinned: true` sections). This keeps `CLAUDE.md` and Copilot output lean.
- Ajv errors reference the offending YAML path (e.g., `/policy/sections/2/id: must be unique`).

## 5. CLI commands

| Command | Behavior | Exit codes |
|---|---|---|
| `agent-policy init` | Scaffold `agent-policy.yaml`. Refuses to overwrite; `--force` required. | 0 ok, 2 exists |
| `agent-policy validate` | Parse + schema-validate config. Prints errors with YAML line/column. | 0 ok, 1 invalid |
| `agent-policy render [--renderer <id>]` | Render to stdout. Pure read. | 0 ok, 1 config error |
| `agent-policy sync` | Render all enabled renderers and write to disk. Creates parent dirs. Refuses to overwrite a file **lacking** the generated banner unless `--force`. | 0 ok, 1 error, 2 would-clobber |
| `agent-policy sync --check` | Render in memory, diff against disk, print unified diff of drift. | 0 in-sync, 1 drift, 2 error |
| `agent-policy check-commit <file\|->` | Validate a commit message from a path or stdin. Enforces the `Assisted-by:` policy. | 0 ok, 1 invalid |
| `agent-policy install-hooks` | Install the `commit-msg` hook. Respects `core.hooksPath`. Idempotent. Backs up foreign hooks. | 0 ok, 1 error |

Cross-cutting flags: `--config <path>` (default: find `agent-policy.yaml` upward from cwd), `--cwd <path>`, `--json`, `--quiet`.

### Generated banner

Every renderer output starts with:

```
<!-- Generated by agent-policy. Do not edit directly. Edit agent-policy.yaml instead. -->
<!-- agent-policy:hash=<sha256-of-rendered-body> -->
```

The `hash=` field is SHA-256 of the rendered body **excluding** the banner lines, so the hash is reproducible across machines. `sync --check` uses the hash to distinguish "user edited the generated file" from "policy changed" in its error messages.

### Commit-msg hook script

```sh
#!/bin/sh
# agent-policy:commit-msg v1
exec agent-policy check-commit "$1"
```

The hook shells out to the installed CLI so validation logic lives in one place and upgrades with the package.

## 6. Renderer strategy

All renderers share one pipeline: **config → filter sections → compose document → wrap in banner**.

Output structure:

```
<banner>
# <project.name>
<project.description, if set>

## <section 1 title>
<section 1 body>

## <section 2 title>
<section 2 body>

...

## Attribution
<attribution policy summary>
```

Per-renderer specifics:

- **AGENTS.md** — includes every section. Canonical full document.
- **CLAUDE.md** — `concise: true`: includes sections listing `claude_md` or tagged `pinned`. Adds a short preamble pointing back to `AGENTS.md` as the authoritative source.
- **`.github/copilot-instructions.md`** — same concise logic with id `copilot_instructions`. No preamble (Copilot prefers plain instructions). Length target: well under the Copilot truncation limit (~500 lines).

Determinism contract:

- Section order follows declaration order. No implicit sorting.
- Line endings normalized to `\n`; trailing newline always present.
- No timestamps, host, or user info. Same input → same bytes.
- Verified by a byte-equality test that renders the same config twice.

## 7. Commit-msg hook & validation

### `install-hooks`

1. Resolve hooks directory with `git rev-parse --git-path hooks` (handles `core.hooksPath`, worktrees, submodules).
2. Target: `<hooks-dir>/commit-msg`.
3. Cases:
   - No existing hook → write ours, `chmod +x`.
   - Existing hook is ours (marker `# agent-policy:commit-msg v1`) → no-op.
   - Existing hook is foreign → back up to `commit-msg.bak` (error if backup exists) and install ours. `--force` suppresses the backup-exists error. Never silently overwrite.
4. Emit a one-line summary with the resolved path.

### `check-commit` logic

1. Read the commit message file; skip lines starting with `#`.
2. Extract footer lines matching `^Assisted-by:\s+.+$` from the **last paragraph** (standard `git interpret-trailers` convention).
3. Apply config rules:
   - If `attribution.assisted_by.required === true` and zero footers found → fail: missing footer.
   - Each found footer must match either `^Assisted-by:\s+n/a$` (human marker) or `^Assisted-by:\s+[A-Za-z0-9._-]+:[A-Za-z0-9._-]+$` (agent:model). Any other footer → fail: malformed.
   - If `allow_multiple === false` and more than one footer found → fail.
4. Errors reference the offending line number in the commit message.

### Explicit non-goals for v0.1

- Conventional Commit validation on the subject line.
- Checkpoint subject format validation.
- `Signed-off-by` / DCO checks.

## 8. `agent47` Claude Code plugin

Lives at `integrations/claude-code/agent47/`. Real plugin, not a template.

```
integrations/claude-code/agent47/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   ├── init.md         # /agent47:init
│   ├── sync.md         # /agent47:sync
│   ├── check.md        # /agent47:check  (runs sync --check)
│   └── render.md       # /agent47:render
├── skills/
│   └── following-agent-policy/
│       └── SKILL.md
├── README.md
└── marketplace/
    └── marketplace.json   # PROVISIONAL scaffold
```

`plugin.json` essentials:

```json
{
  "name": "agent-policy",
  "version": "0.1.0",
  "description": "Keep AI coding-agent instruction files in sync and enforce commit attribution.",
  "homepage": "https://github.com/V-ivek/agent-policy",
  "commands": { "path": "./commands" },
  "skills": { "path": "./skills" }
}
```

Each slash command is a thin wrapper that shells out to the installed CLI. The skill teaches Claude two things: (a) add the correct `Assisted-by:` footer on commits in a repo that has `agent-policy.yaml`, and (b) run `/agent47:sync` after editing `agent-policy.yaml`.

The marketplace manifest is **explicitly provisional**. Its file header notes that it is a template, not a registered manifest, and that publishing requires owning the `agent47` namespace on the target marketplace.

Non-goals for the plugin:

- No PreToolUse hook on `git commit`. Commit messages often come via `$EDITOR`, which a Claude Code hook would not see — brittle and redundant with the git `commit-msg` hook.
- No replacement for the git hook. Enforcement lives in git.

## 9. Repository layout

```
.
├── README.md
├── LICENSE                           # MIT (already present)
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── CHANGELOG.md
├── package.json                      # @agent47/agent-policy, bin: agent-policy
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── .eslintrc.cjs
├── .prettierrc
├── .gitignore
├── .npmignore                        # ships only dist/ + schemas/ + README + LICENSE
├── .github/
│   ├── workflows/{ci.yml, release.yml}
│   ├── ISSUE_TEMPLATE/{bug_report.md, feature_request.md}
│   └── pull_request_template.md
├── src/
│   ├── cli.ts
│   ├── commands/{init,validate,render,sync,check-commit,install-hooks}.ts
│   ├── config/{load,schema,types}.ts
│   ├── renderers/{index,agents-md,claude-md,copilot}.ts
│   └── io/{fs,git,hook}.ts
├── schemas/agent-policy.schema.json
├── tests/
│   ├── fixtures/
│   ├── renderers.test.ts
│   ├── check-commit.test.ts
│   ├── sync.test.ts
│   └── install-hooks.test.ts
├── examples/
│   ├── minimal/agent-policy.yaml
│   └── full/{agent-policy.yaml, AGENTS.md, CLAUDE.md, .github/copilot-instructions.md}
├── integrations/claude-code/agent47/
└── docs/
    ├── getting-started.md
    ├── configuration.md
    ├── commands.md
    ├── renderers.md
    ├── commit-attribution.md
    ├── claude-code-integration.md
    └── roadmap.md
```

### `package.json` essentials

- `"name": "@agent47/agent-policy"`
- `"bin": { "agent-policy": "dist/cli.js" }`
- `"type": "module"`, `"engines": { "node": ">=20" }`
- `repository`, `bugs`, `homepage` → `github.com/V-ivek/agent-policy`
- Scripts: `build` (tsup), `test` (vitest), `lint` (eslint), `typecheck` (tsc --noEmit), `dev` (tsup --watch)

### CI

`ci.yml`: matrix on Node 20 and 22, Ubuntu. Steps: install → lint → typecheck → test → build → end-to-end smoke test running `./dist/cli.js sync --check` against `examples/full/`.

`release.yml`: triggered on `v*.*.*` tags. Builds, tests, publishes to npm with `--access public`, creates a GitHub Release with the CHANGELOG entry.

### Versioning

SemVer. 0.x while the config schema stabilizes; schema-affecting changes bump minor in 0.x, major after 1.0.

## 10. Testing strategy

- **Pure units.** Config loader, schema validator, renderers — no filesystem. Snapshot tests for renderer output; a determinism test asserts byte-equality across two runs.
- **Integration.** `sync`, `install-hooks` tests use `tmp` directories with initialized git repos. No network.
- **Table-driven `check-commit`.** ~20 fixtures covering valid agent:model, valid human marker, multiple valid, missing footer, malformed footer, footer not in last paragraph, comment lines, `allow_multiple: false` with two footers, etc.
- **E2E smoke in CI.** `examples/full/` is treated as a working fixture; CI runs `sync --check` on it after `build`.

## 11. Implementation sequencing

Each milestone is a checkpoint commit.

1. **Scaffold** — `package.json`, `tsconfig`, `tsup`, `vitest`, `eslint`. CI green on an empty test.
2. **Config core** — YAML loader, JSON Schema, Ajv validator, typed model, unit tests.
3. **Renderers** — all three, with snapshot + determinism tests.
4. **Read-side commands** — `init`, `validate`, `render`.
5. **Write-side commands** — `sync`, `sync --check` with banner and hash guard.
6. **Commit validation** — `check-commit` with the fixture table.
7. **Hook install** — `install-hooks` with backup and idempotency.
8. **`agent47` plugin** — `plugin.json`, four slash commands, skill file, README, provisional marketplace template.
9. **Docs + examples** — README, seven docs pages, minimal + full examples with generated outputs checked in.
10. **Release polish** — CI, release workflow, CHANGELOG, issue/PR templates, CODE_OF_CONDUCT.
11. **Final summary + push instructions** — summary doc and exact `git remote add` / `git push` commands for `github.com/V-ivek/agent-policy`.

### Commit discipline during execution

Meaningful checkpoint commits per milestone. Subject: `checkpoint(seq=N): <summary>`. No `Assisted-by:` footer required on checkpoints since enforcement is not installed yet. At the end, squash into one Conventional Commit with an `Assisted-by: claude:opus-4-7` footer.

## 12. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Claude Code plugin manifest format changes | Keep the plugin surface small (4 commands + 1 skill). Document the manifest version used and reference the format in `docs/claude-code-integration.md`. |
| Marketplace publication requires ownership of `agent47` that the user does not yet have | Mark the marketplace manifest provisional with a header comment; document the publishing steps separately. |
| Git hooks directory edge cases (worktrees, submodules, `core.hooksPath`) | Always resolve via `git rev-parse --git-path hooks`; test against tmp repos with each configuration. |
| Foreign `commit-msg` hook already installed | Back up to `.bak`, never silently overwrite; error if backup already exists unless `--force`. |
| Schema evolution in 0.x | `version: 1` is mandatory; schema-affecting changes bump minor; add a migration note in CHANGELOG for any break. |
| Renderer output drift across platforms (line endings, encoding) | Normalize to `\n` and UTF-8; byte-equality test in CI. |

## 13. Open questions (deferred)

These were explicitly de-scoped from v0.1 but are likely for v0.2+:

- Conventional Commit validation on the subject line.
- Checkpoint commit subject format validation.
- JSON Schema export command (`agent-policy schema`).
- Dry-run mode on `sync`.
- Config formatter / linter.
- GitHub Action example.
- Husky / Lefthook / pre-commit examples.
- Cursor Rules renderer.
