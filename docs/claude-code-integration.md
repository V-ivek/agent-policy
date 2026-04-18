# Claude Code integration (`47nation`)

The repo ships a Claude Code plugin under [`integrations/claude-code/47nation/`](../integrations/claude-code/47nation/). It makes `agent-policy` easy to drive from a Claude Code session.

## What's included

```
integrations/claude-code/47nation/
├── .claude-plugin/
│   └── plugin.json                        # plugin manifest
├── commands/
│   ├── init.md                            # /agent-policy:init
│   ├── sync.md                            # /agent-policy:sync
│   ├── check.md                           # /agent-policy:check   (wraps sync --check)
│   └── render.md                          # /agent-policy:render
├── skills/
│   └── following-agent-policy/SKILL.md    # teaches the Assisted-by convention
├── README.md                              # plugin-level install + usage
└── marketplace/
    ├── marketplace.json                   # PROVISIONAL publisher manifest
    └── README.md                          # publishing steps
```

Naming: `47nation` is the publisher/org (mirrors the `@47nation` npm scope). `agent-policy` is the plugin name in `plugin.json`, so the slash-command prefix is `/agent-policy:`.

## Prerequisites

Install the CLI on the machine where Claude Code runs:

```sh
npm install -g @47nation/agent-policy
```

The plugin's slash commands shell out to the installed `agent-policy` binary.

## Local install

Clone this repo, then copy the plugin into your Claude Code plugins directory:

```sh
cp -R integrations/claude-code/47nation ~/.claude/plugins/
```

Reload Claude Code. The four slash commands become available, and the skill activates automatically in any repo that contains `agent-policy.yaml`.

## Slash commands

| Command | Runs | Notes |
|---|---|---|
| `/agent-policy:init` | `agent-policy init` | Won't pass `--force` without explicit user confirmation. |
| `/agent-policy:sync` | `agent-policy sync` | On exit 2 (clobber), inspects listed files before `--force`. |
| `/agent-policy:check` | `agent-policy sync --check` | Drift check for the current repo. |
| `/agent-policy:render` | `agent-policy render [--renderer <id>]` | Pure read. |

Each command has a permission scope limited to its specific bash invocation.

## The skill

`skills/following-agent-policy/SKILL.md` teaches Claude:

1. To add the correct `Assisted-by:` footer when it authors commits in a repo that has `agent-policy.yaml`.
2. To run `/agent-policy:sync` after editing `agent-policy.yaml`.
3. To run `/agent-policy:check` before claiming a task is done.

The skill activates automatically in repos with `agent-policy.yaml`. You don't need to invoke it manually.

## What the plugin does NOT do

- **It doesn't replace the git `commit-msg` hook.** `agent-policy install-hooks` is the authoritative enforcement — the plugin is for ergonomics.
- **It doesn't intercept `git commit`.** Commit messages often arrive via `$EDITOR`, which a Claude Code tool hook wouldn't see. The git hook catches all paths.

## Marketplace publishing (provisional)

See [`integrations/claude-code/47nation/marketplace/README.md`](../integrations/claude-code/47nation/marketplace/README.md) for how to publish `47nation` as a plugin publisher. The template under `marketplace/` is **not** a registered manifest; it is a scaffold to adapt once the target marketplace is chosen and the `47nation` namespace is registered.
