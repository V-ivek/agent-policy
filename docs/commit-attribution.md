# Commit attribution

Every commit in a repo that uses `agent-policy` ends with an `Assisted-by:` footer. This page documents the accepted shapes, the rules, and how enforcement works.

## Accepted footers

AI-assisted commit:

```
<commit subject>

<commit body (optional)>

Assisted-by: <agent>:<model>
```

Both `agent` and `model` are `[A-Za-z0-9._-]+`. Examples:

```
Assisted-by: claude:opus-4-7
Assisted-by: copilot:v1
Assisted-by: cursor:gpt-5
```

Multiple agents contributed (allowed by default):

```
Assisted-by: claude:opus-4-7
Assisted-by: copilot:v1
```

Human-only commit (no AI):

```
Assisted-by: n/a
```

The exact human marker is configurable via `attribution.assisted_by.human_marker` (default `Assisted-by: n/a`).

## Rules

Footers are parsed using the standard git-trailer convention: they must live in the **last paragraph** of the message. If the last paragraph contains anything that isn't a trailer line, none of the lines are treated as trailers.

The `commit-msg` hook (installed via `agent-policy install-hooks`) enforces:

1. If `attribution.assisted_by.required === true` and there is no `Assisted-by:` footer → reject.
2. If `allow_multiple === false` and there is more than one `Assisted-by:` footer → reject.
3. Every `Assisted-by:` footer must match the `human_marker` exactly OR `Assisted-by: <agent>:<model>`. Malformed footers are rejected with a line-number error.

## Relaxing to opt-in

For repos that don't want strict enforcement:

```yaml
attribution:
  assisted_by:
    required: false
```

With `required: false`, missing footers are allowed, but any footer that IS present still has to match the format.

## Single-vendor mode

To require exactly one footer:

```yaml
attribution:
  assisted_by:
    required: true
    allow_multiple: false
```

## What happens at commit time

The installed hook is a small shell script:

```sh
#!/bin/sh
# agent-policy:commit-msg v1
exec agent-policy check-commit "$1"
```

Git passes the path of the in-progress commit message file; the CLI validates it. Exit 0 allows the commit; exit 1 rejects it and prints a line-level error.

## Checking a message manually

```sh
agent-policy check-commit path/to/COMMIT_EDITMSG
# or
echo "feat: x

Assisted-by: claude:opus-4-7" | agent-policy check-commit -
```

## Non-goals

For v0.1, the hook does **not**:

- Enforce Conventional Commit syntax on the subject line.
- Validate the checkpoint-commit subject format.
- Enforce `Signed-off-by` / DCO.

See [`roadmap.md`](roadmap.md) for planned additions.
