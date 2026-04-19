# Roadmap

`agent-policy` 0.1 deliberately ships a tight MVP. The items below were explicitly deferred and are planned for later releases.

## v0.2 candidates

- **Conventional Commit validation on the subject line.** Opt-in via `final_commit.conventional_commits: true`. Will be enforced by the same `commit-msg` hook.
- **Checkpoint commit subject-format validation.** Opt-in via `checkpoint_commit.enabled: true`, using the `subject_format` template to accept matching subjects.
- **JSON Schema export command.** `agent-policy schema` prints the bundled `schemas/agent-policy.schema.json` to stdout for editor integrations.
- **Dry-run on `sync`.** `agent-policy sync --dry-run` prints what would change without writing.
- **Config formatter / linter.** `agent-policy format` rewrites `agent-policy.yaml` in canonical style.
- **Cursor Rules renderer.** `.cursor/rules/` target for the Cursor editor.
- **GitHub Action example.** Reusable workflow snippet for `sync --check` and `check-commit`.
- **Husky / Lefthook / pre-commit examples.** Ready-made integration snippets for popular hook managers.

## Beyond v0.2

- **Per-section frontmatter in rendered output.** Optional per-renderer frontmatter (e.g., for Cursor's `description:` field).
- **Multi-repo mode.** A `workspaces:` key for monorepos where sub-packages have their own `agent-policy.yaml` but share a parent policy.
- **Diff explanations.** When `sync --check` detects drift, emit a semantic diff (which sections changed) instead of a raw unified diff.
- **Remote schema registry.** Allow `$ref`ing a shared schema version so the config can self-update across many repos.

## Non-goals (long-term)

- Runtime agent protocol standardization. `agent-policy` is about static instruction files and commit attribution, not how agents communicate.
- Inventing vendor-specific behaviors that only some AI tools honor.
- Replacing `git` plumbing. `agent-policy install-hooks` is a thin wrapper; anything that should live in `git config` stays there.

## Stability posture

`agent-policy` uses SemVer. While the config schema is at `version: 1` and the package is 0.x:

- Any schema-affecting change bumps the minor version.
- A schema breaking change bumps `version: 1` → `version: 2` and ships a migration command before removal.
- After 1.0, breaking config changes bump the major version.
