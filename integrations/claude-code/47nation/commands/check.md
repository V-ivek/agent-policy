---
description: Drift-check generated instruction files against agent-policy.yaml.
allowed-tools: Bash(agent-policy sync --check:*)
---

Run `agent-policy sync --check` in the current repository.

- Exit 0: files are in sync. Report this briefly.
- Exit 1: drift detected. Show the command output and suggest `/agent-policy:sync`.
- Exit 2: config error. Surface the error to the user.
