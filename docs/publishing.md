# Publishing `@47nation/agent-policy` to npm

This document records how the package is published and what needs to be in place.

## Identity

- **npm scope**: `47nation` (organization, owned by `V-ivek`).
- **Package name**: `@47nation/agent-policy`.
- **CLI bin**: `agent-policy` (unchanged — installs a binary by that name).
- **Install for end users**:

  ```sh
  npm install -g @47nation/agent-policy   # global
  npx @47nation/agent-policy init         # one-off, no install
  ```

## Prerequisites (one-time setup)

1. **npm account + scope ownership.** The org `47nation` exists on npmjs.com, owned by `V-ivek`. Members of the org can publish under `@47nation/*`.
2. **GitHub repo secret `NPM_TOKEN`.** Generate an **Automation** token at npmjs.com → Access Tokens → Generate → "Automation" (no 2FA challenge required for CI). Add it to `V-ivek/agent-policy` → Settings → Secrets and variables → Actions → `NPM_TOKEN`.
3. **Local `npm login`** (only if publishing manually, not needed for CI).

## Automated publishing (preferred)

The workflow at [`.github/workflows/release.yml`](../.github/workflows/release.yml) publishes on any git tag matching `v*.*.*`.

```sh
# From a clean main branch
git checkout main
git pull

# Bump and tag
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
```

The workflow runs `npm ci`, `npm test`, `npm run build`, then `npm publish --access public --provenance` and creates a GitHub Release with generated notes.

`--access public` is mandatory for scoped free-tier packages. `--provenance` attests the build (via Sigstore) so consumers can verify the package was built by this exact workflow.

## Manual publishing (fallback)

From a clean, up-to-date `main`:

```sh
npm login                # browser flow
npm run build
npm publish --access public
```

Do not publish from a feature branch. Do not publish with uncommitted changes.

## Versioning

SemVer. In the 0.x range:

- Schema-affecting config changes bump the **minor** version (0.1 → 0.2).
- Breaking schema changes bump `version: 1` → `version: 2` in `agent-policy.yaml` and ship a migration command before removal.

After 1.0.0, breaking changes bump the major.

## Pre-publish checklist

Before tagging a release:

- [ ] `npm test` green
- [ ] `npm run typecheck` clean
- [ ] `npm run lint` clean
- [ ] `npm run build` produces `dist/cli.js`
- [ ] `agent-policy sync --check` on `examples/full/` exits 0
- [ ] `npm pack --dry-run` ships only `dist/`, `schemas/`, `LICENSE`, `README.md`, `package.json`
- [ ] `CHANGELOG.md` entry moved from `[Unreleased]` into the new version section
- [ ] `package.json` version matches the intended tag

## Post-publish verification

```sh
npm view @47nation/agent-policy
# confirms the version is live
npx @47nation/agent-policy@latest --version
# confirms install path works
```

## Deprecating a version

```sh
npm deprecate @47nation/agent-policy@<version> "<reason>"
```

Do not unpublish — it breaks downstream installs. Always deprecate with a migration message instead.

## Trademark / naming notes

- `47nation` is the publisher (npm org, marketplace publisher, Claude Code plugin directory).
- `agent-policy` is the product and CLI binary name.
- The slash command prefix for the Claude Code plugin is `/agent-policy:` — it matches the product name, not the publisher.
