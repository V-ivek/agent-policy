# Contributing to agent-policy

Thanks for taking the time to contribute. This document covers how to file issues, propose changes, and set up your dev environment.

## Filing an issue

- **Bug report:** please include a minimal `agent-policy.yaml` that reproduces the issue, the `agent-policy --version`, Node version, and OS. Use the issue template.
- **Feature request:** describe the problem first, then the proposed solution. Alternatives welcome.

## Proposing a change

1. Open an issue first if the change is non-trivial (new command, schema change, renderer behavior). Small bug fixes and typo corrections can go straight to a PR.
2. Fork, branch, commit, PR. Follow the commit-message convention below.
3. CI must be green before review. Run the checks locally first: `npm test && npm run typecheck && npm run lint && npm run build`.

## Dev setup

```sh
git clone https://github.com/V-ivek/agent-policy
cd agent-policy
npm install
npm test          # vitest
npm run typecheck # tsc --noEmit
npm run lint      # eslint
npm run build     # bundle to dist/cli.js
npm run format    # prettier --write .
```

Target Node 20 LTS. CI also runs on Node 22.

## Code style

- TypeScript strict mode. No `any` without a comment explaining why.
- Small modules. One responsibility per file.
- Comments only when the *why* is non-obvious. Don't explain *what* — good names do that.
- No dead code. Delete, don't `// removed`.

## Testing

- Every command has a dedicated test file under `tests/`.
- Renderer changes need snapshot or byte-equality tests; don't rely on eyeballing output.
- Tests must not write to the working directory. Use `mkdtempSync(tmpdir(), ...)`.
- For tests that exercise git, use `execSync('git init -q', { cwd: tmpDir })` — never assume a surrounding git state.

## Commit messages

This project eats its own dog food. Every commit ends with an `Assisted-by:` footer:

```
feat: add cursor rules renderer

Assisted-by: claude:opus-4-7
```

Or, for human-only commits:

```
chore: rename variable

Assisted-by: n/a
```

The `commit-msg` hook will block malformed messages. To install it in your clone:

```sh
npm run build
node dist/cli.js install-hooks
```

## Adding a new renderer

See [`docs/renderers.md#adding-a-new-renderer`](docs/renderers.md#adding-a-new-renderer) for the step-by-step. Short version: add the id to the type union + JSON Schema, implement `Renderer`, register it in `src/renderers/index.ts`, add a test.

## Releasing (maintainers only)

See [`docs/publishing.md`](docs/publishing.md) for the full checklist (npm org, `NPM_TOKEN` secret, automated vs manual flow). Short version:

1. Update `CHANGELOG.md`: move entries from `[Unreleased]` into a new version section.
2. Bump `package.json` version.
3. Commit: `release: v0.x.y`.
4. Tag: `git tag -a v0.x.y -m "v0.x.y"`.
5. Push tag: `git push origin v0.x.y`. The release workflow publishes to npm.

## Code of Conduct

See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). Please be kind.
