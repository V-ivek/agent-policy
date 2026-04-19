---
description: Render enabled agent-policy renderers to disk.
allowed-tools: Bash(agent-policy sync:*)
---

Run `agent-policy sync` in the current repository.

If the command exits with code 2 (would-clobber), inspect the listed files with the
user before deciding whether to pass `--force`. Do not pass `--force` without user
confirmation — the whole point is that these files are hand-authored by default.
