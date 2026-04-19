---
description: Render agent-policy.yaml to stdout without writing to disk.
allowed-tools: Bash(agent-policy render:*)
---

Run `agent-policy render` in the current repository. If the user asks for a specific
renderer (AGENTS.md, CLAUDE.md, Copilot), pass `--renderer <id>` where id is one of
`agents_md`, `claude_md`, `copilot_instructions`.

Print the result to the user.
