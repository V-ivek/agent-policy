---
description: Scaffold an agent-policy.yaml in the current repo.
allowed-tools: Bash(agent-policy init:*)
---

Run `agent-policy init` in the current repository.

If the file already exists, stop and report that. Do not pass `--force` unless the user
explicitly asks for it — overwriting a config file is destructive.

After a successful init, summarize the scaffolded file to the user in 3–5 lines and
suggest running `/agent-policy:sync`.
