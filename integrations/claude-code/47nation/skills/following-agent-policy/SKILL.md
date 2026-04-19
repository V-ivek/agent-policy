---
name: following-agent-policy
description: Use in any repository that contains an agent-policy.yaml. Teaches the correct Assisted-by commit footer and the sync workflow for generated instruction files.
---

# Following agent-policy

This skill applies whenever the current repository has an `agent-policy.yaml` at or
above the working directory.

## Commit attribution

Every commit you author must end with an `Assisted-by:` footer. Use the format
configured in `attribution.assisted_by.format` (default `Assisted-by: {agent}:{model}`):

```
feat: add widget

Assisted-by: claude:opus-4-7
```

If multiple agents contributed, emit one footer per agent (default
`allow_multiple: true`).

If the commit is genuinely human-only (no AI assistance), use the configured
`human_marker` (default `Assisted-by: n/a`).

## After editing agent-policy.yaml

Generated instruction files (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`)
must be kept in sync. After any edit to `agent-policy.yaml`, run `/agent-policy:sync` (or
`agent-policy sync` directly) before committing.

## Checking drift

Before claiming a task is done in a repo with `agent-policy.yaml`, run `/agent-policy:check`
to ensure the generated files match the policy. If drift exists, run `/agent-policy:sync`
and include the regenerated files in the commit.

## What this skill does NOT do

- It does not replace the git `commit-msg` hook. If the hook is installed
  (`agent-policy install-hooks`), that hook is the authoritative enforcement.
- It does not invent attribution values. If you do not know the model version, ask
  the user rather than guessing.
