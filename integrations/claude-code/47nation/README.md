# 47nation — Claude Code plugin for agent-policy

This plugin lets you drive [`agent-policy`](https://github.com/V-ivek/agent-policy)
from a Claude Code session.

`47nation` is the publisher; `agent-policy` is the plugin itself, so slash commands live under the `/agent-policy:` prefix.

## Prerequisites

Install the CLI first:

```
npm install -g @47nation/agent-policy
```

Or run it ad hoc: `npx @47nation/agent-policy ...`.

## Slash commands

- `/agent-policy:init` — scaffold `agent-policy.yaml`
- `/agent-policy:sync` — render enabled instruction files
- `/agent-policy:check` — drift-check generated files
- `/agent-policy:render` — render to stdout

## What Claude learns from this plugin

The included skill (`following-agent-policy`) teaches Claude to add the correct
`Assisted-by:` footer when it authors commits in a repository that has an
`agent-policy.yaml`, and to run `/agent-policy:sync` after editing the policy file.

## Local install

From this repository:

```
cp -R integrations/claude-code/47nation ~/.claude/plugins/
```

Reload Claude Code to pick up the new plugin.

## What this plugin does NOT do

- It does not replace the git `commit-msg` hook installed by
  `agent-policy install-hooks`. The git hook is the authoritative enforcement;
  the plugin is for ergonomics.
- It does not intercept `git commit` via Claude Code hooks. Commit messages
  often arrive via `$EDITOR`, which a tool hook would not see.

## Publishing

See `marketplace/README.md` for how to publish `47nation` as a plugin marketplace
publisher. The manifest under `marketplace/` is provisional.
