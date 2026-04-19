# Getting started

A five-minute walkthrough from zero to a repo that enforces commit attribution.

## 1. Install the CLI

```sh
npm install -g @47nation/agent-policy
```

Verify:

```sh
agent-policy --version
# 0.1.0
```

## 2. Scaffold the config

From your repository root:

```sh
agent-policy init
```

This writes `agent-policy.yaml` with a starter policy, three enabled renderers, and strict attribution (`Assisted-by:` required on every commit).

## 3. Edit the config

Open `agent-policy.yaml` and replace the `project` and `policy.sections` with content that matches your repo. The starter file has `overview` and `conventions` sections; add or remove as needed.

Validate as you go:

```sh
agent-policy validate
# agent-policy.yaml: OK
```

Schema errors show the YAML path (e.g., `/policy/sections/1/id: must match pattern "^[a-z0-9][a-z0-9-]*$"`).

## 4. Generate the instruction files

```sh
agent-policy sync
# Wrote AGENTS.md
# Wrote CLAUDE.md
# Wrote .github/copilot-instructions.md
```

Commit these generated files. They carry a banner and content hash so tooling can detect drift later.

## 5. Install the `commit-msg` hook

```sh
agent-policy install-hooks
# Installed commit-msg hook at /path/to/repo/.git/hooks/commit-msg
```

If an existing `commit-msg` hook is present and isn't ours, it's backed up to `commit-msg.bak`.

## 6. Make your first attributed commit

```sh
git add .
git commit -m "chore: adopt agent-policy

Assisted-by: claude:opus-4-7"
```

For a commit you wrote without AI assistance:

```sh
git commit -m "chore: rename file

Assisted-by: n/a"
```

## 7. Keep generated files in sync

Every time you edit `agent-policy.yaml`, re-run `agent-policy sync`. In CI, add the drift check:

```sh
agent-policy sync --check
```

Exit 0 in sync, exit 1 on drift, exit 2 on config error.

## Where to next

- [`configuration.md`](configuration.md) — every config key explained.
- [`commands.md`](commands.md) — exit codes and flags.
- [`commit-attribution.md`](commit-attribution.md) — multi-agent attribution and `allow_multiple`.
- [`claude-code-integration.md`](claude-code-integration.md) — installing the `47nation` plugin.
