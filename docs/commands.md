# Commands

Cross-cutting flags (accepted on every subcommand):

| Flag | Purpose |
|---|---|
| `-c, --config <path>` | Explicit config path. Default: find `agent-policy.yaml` upward from cwd. |
| `-C, --cwd <path>` | Working directory. Default: `process.cwd()`. |
| `--json` | Machine-readable output where the command supports it (currently `validate`). |
| `--quiet` | Suppress non-error output. |

## `agent-policy init`

Scaffold `agent-policy.yaml` in the current directory.

| Flag | Purpose |
|---|---|
| `--force` | Overwrite an existing file. |

Exit codes: `0` ok · `2` file exists (use `--force`).

## `agent-policy validate`

Parse and schema-validate `agent-policy.yaml`. Prints errors with YAML paths.

Exit codes: `0` valid · `1` invalid or missing.

Example error output:

```
agent-policy.yaml: INVALID
  /policy/sections/1/id: must match pattern "^[a-z0-9][a-z0-9-]*$"
  /renderers/claude_md: unknown property "concese"
```

With `--json`:

```json
{
  "path": "agent-policy.yaml",
  "errors": [
    { "path": "/policy/sections/1/id", "message": "..." }
  ]
}
```

## `agent-policy render`

Render enabled renderers to stdout. Pure read — never writes to disk.

| Flag | Purpose |
|---|---|
| `--renderer <id>` | Render only one renderer. `id` is `agents_md`, `claude_md`, or `copilot_instructions`. |

Exit codes: `0` ok · `1` config error or unknown renderer id.

## `agent-policy sync`

Render all enabled renderers and write them to disk. Creates parent directories.

| Flag | Purpose |
|---|---|
| `--check` | Drift mode (see below). |
| `--force` | Overwrite files that do not carry the agent-policy banner. |

Exit codes: `0` ok · `1` config error · `2` would-clobber a non-banner file.

## `agent-policy sync --check`

Render in memory, compare byte-for-byte to files on disk.

Exit codes: `0` in sync · `1` drift detected · `2` config error.

Intended for CI:

```yaml
- run: agent-policy sync --check
```

## `agent-policy check-commit <messageFile>`

Validate a commit message. `<messageFile>` is a path, or `-` to read stdin.

Applies the rules from `attribution.assisted_by`:

1. If `required: true` (default) and no `Assisted-by:` footer exists → fail.
2. If `allow_multiple: false` and more than one `Assisted-by:` footer exists → fail.
3. Every `Assisted-by:` footer must match the `human_marker` exactly, **or** `Assisted-by: <agent>:<model>` where agent/model are `[A-Za-z0-9._-]+`.

Exit codes: `0` valid · `1` invalid or config error.

## `agent-policy install-hooks`

Install the `commit-msg` hook. Resolves the hooks directory with `git rev-parse --git-path hooks` so `core.hooksPath`, worktrees, and submodules are handled.

| Flag | Purpose |
|---|---|
| `--force` | Overwrite `commit-msg.bak` if it already exists. |

Behavior:

- No existing hook → install ours.
- Existing hook is ours (marker `# agent-policy:commit-msg v1`) → no-op.
- Existing hook is foreign → move it to `commit-msg.bak`, install ours. If `commit-msg.bak` already exists, fail unless `--force`.

Exit codes: `0` ok · `1` error.
