# Configuration reference

The canonical source of truth is [`schemas/agent-policy.schema.json`](../schemas/agent-policy.schema.json) (JSON Schema draft 2020-12). This page documents the same fields in a readable shape.

## Top-level

| Field | Type | Required | Purpose |
|---|---|---|---|
| `version` | `1` | Yes | Pinned. Schema bumps go through a migration path. |
| `project` | object | No | Metadata used in the header of generated files. |
| `policy` | object | No | The authoritative content that renderers emit. |
| `attribution` | object | No | How the `commit-msg` hook validates commit messages. |
| `renderers` | object | No | Which renderers are enabled and where they write. |
| `task_policy` | object | No | Documentation-only guidance for multi-step tasks. |
| `checkpoint_commit` | object | No | Documentation-only guidance for checkpoint commits. |
| `final_commit` | object | No | Documentation-only guidance for the final squash commit. |

## `project`

| Field | Type | Purpose |
|---|---|---|
| `name` | string | Used as the `# Title` in generated files. Defaults to `"Project"`. |
| `description` | string | One-line tagline below the title. |

## `policy.sections[]`

Each section is rendered as a `## Title` block in the enabled renderers.

| Field | Type | Required | Purpose |
|---|---|---|---|
| `id` | string | Yes | Unique, lowercase, hyphen-only (`^[a-z0-9][a-z0-9-]*$`). |
| `title` | string | Yes | Section heading. |
| `body` | string | Yes | Markdown body. Multi-line via YAML `\|`. |
| `pinned` | boolean | No | If `true`, included by every renderer even in `concise` mode. |
| `renderers` | array | No | Inclusion list. If set, the section appears only in the listed renderers. Omit = all renderers. Elements: `agents_md`, `claude_md`, `copilot_instructions`. |

## `attribution.assisted_by`

| Field | Type | Default | Purpose |
|---|---|---|---|
| `required` | boolean | `true` | If `true`, every commit must carry at least one valid `Assisted-by:` footer. |
| `format` | string | `"Assisted-by: {agent}:{model}"` | Documentation-only format string shown in generated `## Attribution` sections. |
| `human_marker` | string | `"Assisted-by: n/a"` | Accepted as a valid footer for human-only commits. |
| `allow_multiple` | boolean | `true` | Allow more than one `Assisted-by:` footer per commit (multi-vendor support). |

## `renderers.<id>`

Each of `agents_md`, `claude_md`, `copilot_instructions` accepts:

| Field | Type | Default | Purpose |
|---|---|---|---|
| `enabled` | boolean | `true` | If `false`, the renderer is skipped by `sync` and `sync --check`. |
| `path` | string | see below | Where to write the generated file. |
| `concise` | boolean | `false` | If `true`, omit sections that don't explicitly list this renderer (unless `pinned`). |

Default paths:

| Renderer | Default path |
|---|---|
| `agents_md` | `AGENTS.md` |
| `claude_md` | `CLAUDE.md` |
| `copilot_instructions` | `.github/copilot-instructions.md` |

## `task_policy` / `checkpoint_commit` / `final_commit`

These fields capture commit-workflow conventions for multi-step tasks and squash workflows. In v0.1 they are **documentation-only** — the CLI does not yet enforce them. They exist so your policy file already has them when enforcement lands in a later version.

See [`roadmap.md`](roadmap.md) for planned enforcement.

## Example

See [`examples/full/agent-policy.yaml`](../examples/full/agent-policy.yaml) for a realistic example exercising every field.
