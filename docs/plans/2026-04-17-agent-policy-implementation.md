# agent-policy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a production-quality vendor-neutral CLI (`agent-policy`) that syncs AI coding-agent instruction files from a single `agent-policy.yaml` and enforces `Assisted-by:` commit attribution, plus a Claude Code plugin (`agent47`) that drives it.

**Architecture:** Single TypeScript/Node package. Pure core (config + renderers) with I/O only at the edges (commands, filesystem, git). Renderers are pluggable. `sync --check` renders in memory and diffs. Commit validation runs from a `commit-msg` hook that shells out to the installed CLI.

**Tech Stack:** Node 20+, TypeScript (strict, ESM), `commander`, `yaml`, `ajv` + `ajv-formats`, `vitest`, `tsup`, `eslint`, `prettier`. Claude Code plugin uses the standard plugin manifest format.

**Source design:** `docs/plans/2026-04-17-agent-policy-design.md`

**Working directory:** `/Users/vivek-baraka/Development/agent-policy` (main branch, fresh repo).

---

## Conventions for this plan

- **Package manager:** `npm` (no lockfile conflict since fresh repo).
- **Node version:** 20.x (tested), 22.x (CI matrix).
- **Commit style during execution:** `checkpoint(seq=N): <summary>` per milestone. No `Assisted-by:` footer required until hooks are installed. Final squash at the end into one Conventional Commit with `Assisted-by: claude:opus-4-7` footer.
- **After each task:** run the task's verification command, then commit.
- **If a test fails at Step 2 for a reason other than "function not defined" or "file not found,"** stop and investigate — TDD discipline matters.

---

## Milestone 1 — Project scaffold

### Task 1.1: Initialize Node package and TypeScript

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.npmignore`

**Step 1: Create `.gitignore`**

```gitignore
node_modules/
dist/
coverage/
*.log
.DS_Store
.env
.env.*
!.env.example
```

**Step 2: Create `.npmignore`**

```
src/
tests/
examples/
docs/
integrations/
.github/
tsconfig.json
tsup.config.ts
vitest.config.ts
.eslintrc.cjs
.prettierrc
```

**Step 3: Create `package.json`**

```json
{
  "name": "@agent47/agent-policy",
  "version": "0.1.0",
  "description": "Vendor-neutral CLI to keep AI coding-agent instruction files in sync and enforce commit attribution.",
  "keywords": ["agents", "ai", "claude", "copilot", "agents-md", "claude-md", "cli"],
  "license": "MIT",
  "author": "Vivek <vivek.selvarajan@getbaraka.com>",
  "homepage": "https://github.com/V-ivek/agent-policy",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/V-ivek/agent-policy.git"
  },
  "bugs": {
    "url": "https://github.com/V-ivek/agent-policy/issues"
  },
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "bin": {
    "agent-policy": "dist/cli.js"
  },
  "files": [
    "dist",
    "schemas",
    "LICENSE",
    "README.md"
  ],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format": "prettier --write .",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "ajv": "^8.12.0",
    "ajv-formats": "^3.0.1",
    "commander": "^12.0.0",
    "yaml": "^2.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.57.0",
    "prettier": "^3.2.0",
    "tsup": "^8.0.0",
    "typescript": "^5.4.0",
    "vitest": "^1.4.0"
  }
}
```

**Step 4: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "declaration": false,
    "sourceMap": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Step 5: Install dependencies**

Run: `npm install`
Expected: `added N packages, and audited N+1 packages in Xs` with 0 vulnerabilities (or only low-severity transitive).

**Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json .gitignore .npmignore
git commit -m "checkpoint(seq=1.1): initialize npm package and tsconfig"
```

---

### Task 1.2: Configure tsup, vitest, eslint, prettier

**Files:**
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `.eslintrc.cjs`
- Create: `.prettierrc`
- Create: `.prettierignore`

**Step 1: Create `tsup.config.ts`**

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node20',
  clean: true,
  sourcemap: true,
  banner: { js: '#!/usr/bin/env node' },
  shims: false,
  splitting: false,
  bundle: true,
  minify: false,
});
```

**Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globals: false,
    reporters: 'default',
  },
});
```

**Step 3: Create `.eslintrc.cjs`**

```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { node: true, es2022: true },
  ignorePatterns: ['dist/', 'node_modules/', 'coverage/'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};
```

**Step 4: Create `.prettierrc`**

```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

**Step 5: Create `.prettierignore`**

```
dist/
coverage/
node_modules/
package-lock.json
```

**Step 6: Create a trivial CLI stub to verify build works**

File: `src/cli.ts`

```ts
export function main(): void {
  console.log('agent-policy');
}

main();
```

**Step 7: Run build and verify**

Run: `npm run build && node dist/cli.js`
Expected output: `agent-policy`

**Step 8: Run typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

**Step 9: Commit**

```bash
git add tsup.config.ts vitest.config.ts .eslintrc.cjs .prettierrc .prettierignore src/cli.ts
git commit -m "checkpoint(seq=1.2): configure tsup, vitest, eslint, prettier"
```

---

### Task 1.3: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: Create the workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
      - name: Smoke test sync --check on full example
        run: |
          if [ -d examples/full ]; then
            cd examples/full && node ../../dist/cli.js sync --check
          else
            echo "No examples/full yet — skipping smoke test"
          fi
```

**Step 2: Add a placeholder test so `npm test` does not fail on empty**

File: `tests/sanity.test.ts`

```ts
import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

**Step 3: Run tests locally**

Run: `npm test`
Expected: `1 passed`.

**Step 4: Commit**

```bash
git add .github/workflows/ci.yml tests/sanity.test.ts
git commit -m "checkpoint(seq=1.3): add CI workflow and sanity test"
```

---

## Milestone 2 — Config core (schema, loader, validator)

### Task 2.1: Write JSON Schema

**Files:**
- Create: `schemas/agent-policy.schema.json`

**Step 1: Create the schema**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://github.com/V-ivek/agent-policy/schemas/agent-policy.schema.json",
  "title": "agent-policy config",
  "type": "object",
  "required": ["version"],
  "additionalProperties": false,
  "properties": {
    "version": { "const": 1 },
    "project": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "name": { "type": "string", "minLength": 1 },
        "description": { "type": "string" }
      }
    },
    "policy": {
      "type": "object",
      "additionalProperties": false,
      "required": ["sections"],
      "properties": {
        "sections": {
          "type": "array",
          "items": { "$ref": "#/$defs/section" }
        }
      }
    },
    "attribution": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "assisted_by": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "required": { "type": "boolean", "default": true },
            "format": { "type": "string", "default": "Assisted-by: {agent}:{model}" },
            "human_marker": { "type": "string", "default": "Assisted-by: n/a" },
            "allow_multiple": { "type": "boolean", "default": true }
          }
        }
      }
    },
    "renderers": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "agents_md": { "$ref": "#/$defs/renderer" },
        "claude_md": { "$ref": "#/$defs/renderer" },
        "copilot_instructions": { "$ref": "#/$defs/renderer" }
      }
    },
    "task_policy": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "commit_on_task_completion": { "type": "boolean" },
        "allow_checkpoint_commits": { "type": "boolean" },
        "require_user_prompt_for_squash": { "type": "boolean" }
      }
    },
    "checkpoint_commit": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "enabled": { "type": "boolean" },
        "subject_format": { "type": "string" },
        "run_precommit": { "type": "boolean" }
      }
    },
    "final_commit": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "conventional_commits": { "type": "boolean" },
        "run_precommit": { "type": "boolean" },
        "required_footers": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    }
  },
  "$defs": {
    "section": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "title", "body"],
      "properties": {
        "id": { "type": "string", "pattern": "^[a-z0-9][a-z0-9-]*$" },
        "title": { "type": "string", "minLength": 1 },
        "body": { "type": "string" },
        "pinned": { "type": "boolean", "default": false },
        "renderers": {
          "type": "array",
          "items": { "enum": ["agents_md", "claude_md", "copilot_instructions"] }
        }
      }
    },
    "renderer": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "enabled": { "type": "boolean", "default": true },
        "path": { "type": "string", "minLength": 1 },
        "concise": { "type": "boolean", "default": false }
      }
    }
  }
}
```

**Step 2: Commit**

```bash
git add schemas/agent-policy.schema.json
git commit -m "checkpoint(seq=2.1): add agent-policy JSON Schema"
```

---

### Task 2.2: TypeScript types

**Files:**
- Create: `src/config/types.ts`

**Step 1: Create types matching the schema**

```ts
export type RendererId = 'agents_md' | 'claude_md' | 'copilot_instructions';

export interface PolicySection {
  id: string;
  title: string;
  body: string;
  pinned?: boolean;
  renderers?: RendererId[];
}

export interface RendererConfig {
  enabled?: boolean;
  path?: string;
  concise?: boolean;
}

export interface AssistedByConfig {
  required?: boolean;
  format?: string;
  human_marker?: string;
  allow_multiple?: boolean;
}

export interface AgentPolicyConfig {
  version: 1;
  project?: { name?: string; description?: string };
  policy?: { sections: PolicySection[] };
  attribution?: { assisted_by?: AssistedByConfig };
  renderers?: Partial<Record<RendererId, RendererConfig>>;
  task_policy?: {
    commit_on_task_completion?: boolean;
    allow_checkpoint_commits?: boolean;
    require_user_prompt_for_squash?: boolean;
  };
  checkpoint_commit?: {
    enabled?: boolean;
    subject_format?: string;
    run_precommit?: boolean;
  };
  final_commit?: {
    conventional_commits?: boolean;
    run_precommit?: boolean;
    required_footers?: string[];
  };
}

export const DEFAULT_RENDERER_PATHS: Record<RendererId, string> = {
  agents_md: 'AGENTS.md',
  claude_md: 'CLAUDE.md',
  copilot_instructions: '.github/copilot-instructions.md',
};
```

**Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

**Step 3: Commit**

```bash
git add src/config/types.ts
git commit -m "checkpoint(seq=2.2): add config type definitions"
```

---

### Task 2.3: Config loader (TDD)

**Files:**
- Create: `tests/fixtures/config-minimal.yaml`
- Create: `tests/fixtures/config-full.yaml`
- Create: `tests/config-load.test.ts`
- Create: `src/config/load.ts`

**Step 1: Create fixtures**

`tests/fixtures/config-minimal.yaml`:

```yaml
version: 1
project:
  name: my-repo
policy:
  sections:
    - id: overview
      title: Project overview
      body: |
        Hello world.
```

`tests/fixtures/config-full.yaml`: copy the full example from `docs/plans/2026-04-17-agent-policy-design.md` §4.

**Step 2: Write failing tests**

`tests/config-load.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfigFromString } from '../src/config/load.js';

const minimal = readFileSync(join(__dirname, 'fixtures/config-minimal.yaml'), 'utf8');
const full = readFileSync(join(__dirname, 'fixtures/config-full.yaml'), 'utf8');

describe('loadConfigFromString', () => {
  it('parses minimal config', () => {
    const cfg = loadConfigFromString(minimal);
    expect(cfg.version).toBe(1);
    expect(cfg.project?.name).toBe('my-repo');
    expect(cfg.policy?.sections).toHaveLength(1);
    expect(cfg.policy?.sections[0]?.id).toBe('overview');
  });

  it('parses full config with all fields', () => {
    const cfg = loadConfigFromString(full);
    expect(cfg.attribution?.assisted_by?.required).toBe(true);
    expect(cfg.renderers?.claude_md?.concise).toBe(true);
  });

  it('throws with YAML parse position on malformed YAML', () => {
    expect(() => loadConfigFromString('version: 1\n  bad: [')).toThrow(/YAML/);
  });
});
```

Note: `__dirname` works with vitest + ESM via the config — if it does not, rewrite using `import.meta.url` + `fileURLToPath`.

**Step 3: Run tests to verify fail**

Run: `npm test`
Expected: FAIL with "Cannot find module '../src/config/load.js'".

**Step 4: Implement loader**

`src/config/load.ts`:

```ts
import { parse, YAMLParseError } from 'yaml';
import type { AgentPolicyConfig } from './types.js';

export function loadConfigFromString(source: string): AgentPolicyConfig {
  try {
    const parsed = parse(source);
    if (parsed === null || typeof parsed !== 'object') {
      throw new Error('Config must be a YAML object');
    }
    return parsed as AgentPolicyConfig;
  } catch (err) {
    if (err instanceof YAMLParseError) {
      throw new Error(`YAML parse error: ${err.message}`);
    }
    throw err;
  }
}
```

**Step 5: Run tests to verify pass**

Run: `npm test`
Expected: 3 passed (plus sanity test).

**Step 6: Commit**

```bash
git add tests/fixtures/ tests/config-load.test.ts src/config/load.ts
git commit -m "checkpoint(seq=2.3): config loader with YAML error handling"
```

---

### Task 2.4: Config file loader (filesystem)

**Files:**
- Modify: `src/config/load.ts`
- Create: `tests/config-load-file.test.ts`

**Step 1: Write failing test**

`tests/config-load-file.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfigFromFile, findConfigFile } from '../src/config/load.js';

function mkTmp(): string {
  return mkdtempSync(join(tmpdir(), 'agent-policy-'));
}

describe('loadConfigFromFile', () => {
  it('reads a config file from disk', () => {
    const dir = mkTmp();
    writeFileSync(join(dir, 'agent-policy.yaml'), 'version: 1\n');
    const cfg = loadConfigFromFile(join(dir, 'agent-policy.yaml'));
    expect(cfg.version).toBe(1);
  });
});

describe('findConfigFile', () => {
  it('finds agent-policy.yaml in the given directory', () => {
    const dir = mkTmp();
    writeFileSync(join(dir, 'agent-policy.yaml'), 'version: 1\n');
    expect(findConfigFile(dir)).toBe(join(dir, 'agent-policy.yaml'));
  });

  it('walks up to parent directories', () => {
    const root = mkTmp();
    const child = join(root, 'sub', 'deeper');
    mkdirSync(child, { recursive: true });
    writeFileSync(join(root, 'agent-policy.yaml'), 'version: 1\n');
    expect(findConfigFile(child)).toBe(join(root, 'agent-policy.yaml'));
  });

  it('returns null when no config found', () => {
    const dir = mkTmp();
    expect(findConfigFile(dir)).toBe(null);
  });
});
```

**Step 2: Run tests to verify fail**

Run: `npm test -- config-load-file`
Expected: FAIL with missing exports.

**Step 3: Extend loader**

Add to `src/config/load.ts`:

```ts
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, parse as parsePath } from 'node:path';

export function loadConfigFromFile(path: string): AgentPolicyConfig {
  const source = readFileSync(path, 'utf8');
  return loadConfigFromString(source);
}

export function findConfigFile(startDir: string): string | null {
  let dir = startDir;
  while (true) {
    const candidate = join(dir, 'agent-policy.yaml');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
```

**Step 4: Run tests to verify pass**

Run: `npm test`
Expected: all pass.

**Step 5: Commit**

```bash
git add src/config/load.ts tests/config-load-file.test.ts
git commit -m "checkpoint(seq=2.4): config file loader with upward search"
```

---

### Task 2.5: Schema validator (TDD)

**Files:**
- Create: `src/config/schema.ts`
- Create: `tests/config-schema.test.ts`

**Step 1: Write failing tests**

`tests/config-schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateConfig } from '../src/config/schema.js';

describe('validateConfig', () => {
  it('accepts a minimal valid config', () => {
    const result = validateConfig({
      version: 1,
      project: { name: 'x' },
      policy: { sections: [{ id: 'a', title: 'A', body: 'b' }] },
    });
    expect(result.ok).toBe(true);
  });

  it('rejects missing version', () => {
    const result = validateConfig({ project: { name: 'x' } });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.path).toBe('');
      expect(result.errors[0]?.message).toMatch(/version/);
    }
  });

  it('rejects wrong version', () => {
    const result = validateConfig({ version: 2 });
    expect(result.ok).toBe(false);
  });

  it('rejects unknown top-level keys', () => {
    const result = validateConfig({ version: 1, foo: 'bar' });
    expect(result.ok).toBe(false);
  });

  it('rejects bad section id', () => {
    const result = validateConfig({
      version: 1,
      policy: { sections: [{ id: 'Bad ID', title: 'x', body: 'y' }] },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.path).toMatch(/\/policy\/sections\/0\/id/);
    }
  });

  it('rejects duplicate section ids', () => {
    const result = validateConfig({
      version: 1,
      policy: {
        sections: [
          { id: 'a', title: 'A', body: 'x' },
          { id: 'a', title: 'B', body: 'y' },
        ],
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /duplicate/i.test(e.message))).toBe(true);
    }
  });
});
```

**Step 2: Run tests to verify fail**

Run: `npm test -- config-schema`
Expected: FAIL.

**Step 3: Implement validator**

`src/config/schema.ts`:

```ts
import Ajv, { type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { AgentPolicyConfig } from './types.js';

export interface ValidationError {
  path: string;
  message: string;
}

export type ValidationResult =
  | { ok: true; config: AgentPolicyConfig }
  | { ok: false; errors: ValidationError[] };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve schema path in both dev (src/) and built (dist/) layouts.
function loadSchema(): unknown {
  const candidates = [
    join(__dirname, '../../schemas/agent-policy.schema.json'),
    join(__dirname, '../schemas/agent-policy.schema.json'),
  ];
  for (const p of candidates) {
    try {
      return JSON.parse(readFileSync(p, 'utf8'));
    } catch {
      /* try next */
    }
  }
  throw new Error('agent-policy schema not found');
}

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(loadSchema());

function toValidationErrors(errors: ErrorObject[] | null | undefined): ValidationError[] {
  if (!errors) return [];
  return errors.map((e) => ({
    path: e.instancePath,
    message: `${e.instancePath || '(root)'} ${e.message ?? 'invalid'}`,
  }));
}

function checkUniqueSectionIds(config: AgentPolicyConfig): ValidationError[] {
  const sections = config.policy?.sections ?? [];
  const seen = new Set<string>();
  const errors: ValidationError[] = [];
  sections.forEach((s, i) => {
    if (seen.has(s.id)) {
      errors.push({
        path: `/policy/sections/${i}/id`,
        message: `duplicate section id "${s.id}"`,
      });
    }
    seen.add(s.id);
  });
  return errors;
}

export function validateConfig(input: unknown): ValidationResult {
  if (!validate(input)) {
    return { ok: false, errors: toValidationErrors(validate.errors) };
  }
  const config = input as AgentPolicyConfig;
  const semanticErrors = checkUniqueSectionIds(config);
  if (semanticErrors.length > 0) {
    return { ok: false, errors: semanticErrors };
  }
  return { ok: true, config };
}
```

**Step 4: Run tests to verify pass**

Run: `npm test`
Expected: all pass.

**Step 5: Commit**

```bash
git add src/config/schema.ts tests/config-schema.test.ts
git commit -m "checkpoint(seq=2.5): Ajv-based config schema validator"
```

---

## Milestone 3 — Renderers

### Task 3.1: Common renderer utilities (banner + hash)

**Files:**
- Create: `src/renderers/common.ts`
- Create: `tests/renderers-common.test.ts`

**Step 1: Write failing tests**

`tests/renderers-common.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { wrapWithBanner, bodyHash, BANNER_FIRST_LINE } from '../src/renderers/common.js';

describe('banner', () => {
  it('produces a deterministic banner with hash', () => {
    const body = '# Hello\n\nbody\n';
    const out = wrapWithBanner(body);
    expect(out.startsWith(BANNER_FIRST_LINE)).toBe(true);
    expect(out).toContain('agent-policy:hash=');
    expect(out.endsWith('\n')).toBe(true);
  });

  it('same body yields identical output', () => {
    const a = wrapWithBanner('body\n');
    const b = wrapWithBanner('body\n');
    expect(a).toBe(b);
  });

  it('hash is deterministic for the body', () => {
    expect(bodyHash('abc')).toBe(bodyHash('abc'));
    expect(bodyHash('abc')).not.toBe(bodyHash('abd'));
  });
});
```

**Step 2: Run tests to verify fail**

Run: `npm test -- renderers-common`
Expected: FAIL.

**Step 3: Implement**

`src/renderers/common.ts`:

```ts
import { createHash } from 'node:crypto';

export const BANNER_FIRST_LINE =
  '<!-- Generated by agent-policy. Do not edit directly. Edit agent-policy.yaml instead. -->';

export function bodyHash(body: string): string {
  return createHash('sha256').update(body, 'utf8').digest('hex').slice(0, 16);
}

export function wrapWithBanner(body: string): string {
  const normalized = body.endsWith('\n') ? body : body + '\n';
  const hash = bodyHash(normalized);
  return `${BANNER_FIRST_LINE}\n<!-- agent-policy:hash=${hash} -->\n\n${normalized}`;
}

export function stripBanner(content: string): { body: string; hash: string | null } {
  const lines = content.split('\n');
  if (lines[0] !== BANNER_FIRST_LINE) {
    return { body: content, hash: null };
  }
  const hashLine = lines[1] ?? '';
  const match = hashLine.match(/agent-policy:hash=([a-f0-9]+)/);
  const hash = match ? match[1]! : null;
  const body = lines.slice(2).join('\n').replace(/^\n/, '');
  return { body, hash };
}
```

**Step 4: Run tests to verify pass**

Run: `npm test`
Expected: pass.

**Step 5: Commit**

```bash
git add src/renderers/common.ts tests/renderers-common.test.ts
git commit -m "checkpoint(seq=3.1): renderer banner and hash utilities"
```

---

### Task 3.2: AgentsMdRenderer

**Files:**
- Create: `src/renderers/agents-md.ts`
- Create: `src/renderers/index.ts`
- Create: `tests/renderer-agents-md.test.ts`

**Step 1: Write failing test**

`tests/renderer-agents-md.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { agentsMdRenderer } from '../src/renderers/agents-md.js';
import { stripBanner } from '../src/renderers/common.js';

describe('agentsMdRenderer', () => {
  it('emits a full document with all sections', () => {
    const out = agentsMdRenderer.render({
      version: 1,
      project: { name: 'repo', description: 'desc' },
      policy: {
        sections: [
          { id: 'a', title: 'Alpha', body: 'first' },
          { id: 'b', title: 'Beta', body: 'second' },
        ],
      },
      attribution: { assisted_by: { required: true } },
    });

    const { body, hash } = stripBanner(out);
    expect(hash).toBeTruthy();
    expect(body).toMatch(/^# repo/);
    expect(body).toContain('desc');
    expect(body).toContain('## Alpha');
    expect(body).toContain('## Beta');
    expect(body).toContain('## Attribution');
    expect(body.indexOf('Alpha') < body.indexOf('Beta')).toBe(true);
  });

  it('produces byte-identical output on repeat render', () => {
    const cfg = {
      version: 1 as const,
      project: { name: 'r' },
      policy: { sections: [{ id: 'x', title: 'X', body: 'y' }] },
    };
    expect(agentsMdRenderer.render(cfg)).toBe(agentsMdRenderer.render(cfg));
  });
});
```

**Step 2: Run tests to verify fail**

Run: `npm test -- renderer-agents-md`
Expected: FAIL.

**Step 3: Implement renderer interface + AgentsMd**

`src/renderers/index.ts`:

```ts
import type { AgentPolicyConfig, RendererId, PolicySection } from '../config/types.js';

export interface Renderer {
  id: RendererId;
  defaultPath: string;
  render(config: AgentPolicyConfig): string;
}

export function filterSections(sections: PolicySection[], forRenderer: RendererId, concise: boolean): PolicySection[] {
  if (!concise) return sections;
  return sections.filter((s) => s.pinned === true || (s.renderers ?? []).includes(forRenderer));
}

export function composeAttributionSection(config: AgentPolicyConfig): string {
  const a = config.attribution?.assisted_by;
  if (!a || a.required === false) return '';
  const format = a.format ?? 'Assisted-by: {agent}:{model}';
  const human = a.human_marker ?? 'Assisted-by: n/a';
  const multi = a.allow_multiple !== false ? ' Multiple footers are allowed for multi-vendor work.' : '';
  return [
    '## Attribution',
    '',
    `All commits must end with an \`Assisted-by:\` footer.`,
    '',
    `- AI-assisted: \`${format}\``,
    `- Human-only: \`${human}\``,
    multi ? `-${multi.trim()}` : '',
  ]
    .filter((l) => l !== '')
    .join('\n');
}
```

`src/renderers/agents-md.ts`:

```ts
import type { Renderer } from './index.js';
import { wrapWithBanner } from './common.js';
import { composeAttributionSection } from './index.js';
import type { AgentPolicyConfig } from '../config/types.js';

function renderBody(config: AgentPolicyConfig): string {
  const parts: string[] = [];
  const name = config.project?.name ?? 'Project';
  parts.push(`# ${name}`);
  if (config.project?.description) parts.push('', config.project.description);
  parts.push('');

  const sections = config.policy?.sections ?? [];
  for (const s of sections) {
    parts.push(`## ${s.title}`, '', s.body.trim(), '');
  }

  const attribution = composeAttributionSection(config);
  if (attribution) parts.push(attribution, '');

  return parts.join('\n');
}

export const agentsMdRenderer: Renderer = {
  id: 'agents_md',
  defaultPath: 'AGENTS.md',
  render(config) {
    return wrapWithBanner(renderBody(config));
  },
};
```

**Step 4: Run tests to verify pass**

Run: `npm test`
Expected: pass.

**Step 5: Commit**

```bash
git add src/renderers/index.ts src/renderers/agents-md.ts tests/renderer-agents-md.test.ts
git commit -m "checkpoint(seq=3.2): AgentsMd renderer with attribution section"
```

---

### Task 3.3: ClaudeMdRenderer and CopilotRenderer (concise filtering)

**Files:**
- Create: `src/renderers/claude-md.ts`
- Create: `src/renderers/copilot.ts`
- Create: `tests/renderer-concise.test.ts`

**Step 1: Write failing test**

`tests/renderer-concise.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { claudeMdRenderer } from '../src/renderers/claude-md.js';
import { copilotRenderer } from '../src/renderers/copilot.js';
import { stripBanner } from '../src/renderers/common.js';
import type { AgentPolicyConfig } from '../src/config/types.js';

const cfg: AgentPolicyConfig = {
  version: 1,
  project: { name: 'r' },
  policy: {
    sections: [
      { id: 'overview', title: 'Overview', body: 'pinned body', pinned: true },
      { id: 'claude-only', title: 'Claude-only', body: 'for claude', renderers: ['claude_md'] },
      { id: 'copilot-only', title: 'Copilot-only', body: 'for copilot', renderers: ['copilot_instructions'] },
      { id: 'agents-only', title: 'Agents-only', body: 'for agents', renderers: ['agents_md'] },
    ],
  },
  renderers: {
    claude_md: { enabled: true, concise: true },
    copilot_instructions: { enabled: true, concise: true },
  },
};

describe('claudeMdRenderer concise', () => {
  it('includes pinned and claude-targeted sections, excludes others', () => {
    const { body } = stripBanner(claudeMdRenderer.render(cfg));
    expect(body).toContain('Overview');
    expect(body).toContain('Claude-only');
    expect(body).not.toContain('Copilot-only');
    expect(body).not.toContain('Agents-only');
  });

  it('includes a preamble pointing to AGENTS.md', () => {
    const { body } = stripBanner(claudeMdRenderer.render(cfg));
    expect(body).toMatch(/AGENTS\.md/);
  });
});

describe('copilotRenderer concise', () => {
  it('includes pinned and copilot-targeted sections only', () => {
    const { body } = stripBanner(copilotRenderer.render(cfg));
    expect(body).toContain('Overview');
    expect(body).toContain('Copilot-only');
    expect(body).not.toContain('Claude-only');
  });

  it('has no preamble (Copilot prefers plain instructions)', () => {
    const { body } = stripBanner(copilotRenderer.render(cfg));
    expect(body).not.toMatch(/AGENTS\.md/);
  });
});
```

**Step 2: Run tests to verify fail**

Run: `npm test -- renderer-concise`
Expected: FAIL.

**Step 3: Implement**

`src/renderers/claude-md.ts`:

```ts
import type { Renderer } from './index.js';
import { wrapWithBanner } from './common.js';
import { filterSections, composeAttributionSection } from './index.js';
import type { AgentPolicyConfig } from '../config/types.js';

const PREAMBLE =
  'This file is a concise mirror for Claude. The canonical, authoritative policy lives in `AGENTS.md`. Do not edit this file by hand — edit `agent-policy.yaml` and run `agent-policy sync`.';

function renderBody(config: AgentPolicyConfig): string {
  const parts: string[] = [];
  const name = config.project?.name ?? 'Project';
  parts.push(`# ${name}`);
  if (config.project?.description) parts.push('', config.project.description);
  parts.push('', PREAMBLE, '');

  const concise = config.renderers?.claude_md?.concise ?? false;
  const sections = filterSections(config.policy?.sections ?? [], 'claude_md', concise);
  for (const s of sections) {
    parts.push(`## ${s.title}`, '', s.body.trim(), '');
  }

  const attribution = composeAttributionSection(config);
  if (attribution) parts.push(attribution, '');
  return parts.join('\n');
}

export const claudeMdRenderer: Renderer = {
  id: 'claude_md',
  defaultPath: 'CLAUDE.md',
  render(config) {
    return wrapWithBanner(renderBody(config));
  },
};
```

`src/renderers/copilot.ts`:

```ts
import type { Renderer } from './index.js';
import { wrapWithBanner } from './common.js';
import { filterSections, composeAttributionSection } from './index.js';
import type { AgentPolicyConfig } from '../config/types.js';

function renderBody(config: AgentPolicyConfig): string {
  const parts: string[] = [];
  const name = config.project?.name ?? 'Project';
  parts.push(`# ${name}`);
  if (config.project?.description) parts.push('', config.project.description);
  parts.push('');

  const concise = config.renderers?.copilot_instructions?.concise ?? false;
  const sections = filterSections(
    config.policy?.sections ?? [],
    'copilot_instructions',
    concise,
  );
  for (const s of sections) {
    parts.push(`## ${s.title}`, '', s.body.trim(), '');
  }

  const attribution = composeAttributionSection(config);
  if (attribution) parts.push(attribution, '');
  return parts.join('\n');
}

export const copilotRenderer: Renderer = {
  id: 'copilot_instructions',
  defaultPath: '.github/copilot-instructions.md',
  render(config) {
    return wrapWithBanner(renderBody(config));
  },
};
```

**Step 4: Run tests to verify pass**

Run: `npm test`
Expected: pass.

**Step 5: Commit**

```bash
git add src/renderers/claude-md.ts src/renderers/copilot.ts tests/renderer-concise.test.ts
git commit -m "checkpoint(seq=3.3): ClaudeMd and Copilot renderers with concise filtering"
```

---

### Task 3.4: Renderer registry + determinism test

**Files:**
- Modify: `src/renderers/index.ts`
- Create: `tests/renderer-determinism.test.ts`

**Step 1: Add registry export to `src/renderers/index.ts`**

Append:

```ts
import { agentsMdRenderer } from './agents-md.js';
import { claudeMdRenderer } from './claude-md.js';
import { copilotRenderer } from './copilot.js';

export const RENDERERS: Record<RendererId, Renderer> = {
  agents_md: agentsMdRenderer,
  claude_md: claudeMdRenderer,
  copilot_instructions: copilotRenderer,
};

export function getEnabledRenderers(config: AgentPolicyConfig): Array<{ renderer: Renderer; path: string }> {
  const result: Array<{ renderer: Renderer; path: string }> = [];
  for (const id of Object.keys(RENDERERS) as RendererId[]) {
    const rc = config.renderers?.[id];
    const enabled = rc?.enabled !== false;
    if (!enabled) continue;
    const path = rc?.path ?? RENDERERS[id].defaultPath;
    result.push({ renderer: RENDERERS[id], path });
  }
  return result;
}
```

Also add import: `import type { AgentPolicyConfig } from '../config/types.js';` if not already present.

**Step 2: Determinism test**

`tests/renderer-determinism.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfigFromString } from '../src/config/load.js';
import { validateConfig } from '../src/config/schema.js';
import { RENDERERS } from '../src/renderers/index.js';

const source = readFileSync(join(__dirname, 'fixtures/config-full.yaml'), 'utf8');

describe('renderer determinism', () => {
  it('renders byte-identical output on repeat', () => {
    const parsed = loadConfigFromString(source);
    const result = validateConfig(parsed);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const r of Object.values(RENDERERS)) {
      const a = r.render(result.config);
      const b = r.render(result.config);
      expect(a).toBe(b);
    }
  });
});
```

**Step 3: Run tests**

Run: `npm test`
Expected: pass.

**Step 4: Commit**

```bash
git add src/renderers/index.ts tests/renderer-determinism.test.ts
git commit -m "checkpoint(seq=3.4): renderer registry and determinism test"
```

---

## Milestone 4 — Read-side commands

### Task 4.1: CLI skeleton with commander

**Files:**
- Modify: `src/cli.ts`
- Create: `src/commands/types.ts`

**Step 1: Create command context type**

`src/commands/types.ts`:

```ts
export interface CommandContext {
  cwd: string;
  configPath?: string;
  json: boolean;
  quiet: boolean;
}
```

**Step 2: Replace `src/cli.ts`**

```ts
import { Command } from 'commander';
import { resolve } from 'node:path';

const program = new Command();

program
  .name('agent-policy')
  .description('Keep AI coding-agent instruction files in sync and enforce commit attribution.')
  .version('0.1.0')
  .option('-c, --config <path>', 'path to agent-policy.yaml')
  .option('-C, --cwd <path>', 'working directory', process.cwd())
  .option('--json', 'machine-readable output', false)
  .option('--quiet', 'suppress non-error output', false);

// Command registrations inserted here by later tasks.

export function run(argv: string[]): Promise<void> {
  return program.parseAsync(argv);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run(process.argv).catch((err) => {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  });
}

export { program };
export function contextFromOpts(opts: Record<string, unknown>): import('./commands/types.js').CommandContext {
  return {
    cwd: resolve(String(opts['cwd'] ?? process.cwd())),
    configPath: typeof opts['config'] === 'string' ? opts['config'] : undefined,
    json: Boolean(opts['json']),
    quiet: Boolean(opts['quiet']),
  };
}
```

**Step 3: Build and verify**

Run: `npm run build && node dist/cli.js --help`
Expected: help output lists `agent-policy` with the flags above.

**Step 4: Commit**

```bash
git add src/cli.ts src/commands/types.ts
git commit -m "checkpoint(seq=4.1): CLI skeleton with commander"
```

---

### Task 4.2: `init` command

**Files:**
- Create: `src/commands/init.ts`
- Modify: `src/cli.ts` (register)
- Create: `tests/command-init.test.ts`

**Step 1: Write failing tests**

`tests/command-init.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mkdtempSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInit } from '../src/commands/init.js';

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'agent-policy-init-'));
}

describe('init', () => {
  it('creates agent-policy.yaml with a valid starter policy', () => {
    const dir = tmp();
    const result = runInit({ cwd: dir, json: false, quiet: true });
    expect(result.exitCode).toBe(0);
    expect(existsSync(join(dir, 'agent-policy.yaml'))).toBe(true);
    const content = readFileSync(join(dir, 'agent-policy.yaml'), 'utf8');
    expect(content).toMatch(/^version: 1\b/m);
    expect(content).toMatch(/policy:/);
    expect(content).toMatch(/attribution:/);
  });

  it('refuses to overwrite existing file', () => {
    const dir = tmp();
    writeFileSync(join(dir, 'agent-policy.yaml'), 'existing: true\n');
    const result = runInit({ cwd: dir, json: false, quiet: true });
    expect(result.exitCode).toBe(2);
    expect(readFileSync(join(dir, 'agent-policy.yaml'), 'utf8')).toBe('existing: true\n');
  });

  it('overwrites with force', () => {
    const dir = tmp();
    writeFileSync(join(dir, 'agent-policy.yaml'), 'existing: true\n');
    const result = runInit({ cwd: dir, json: false, quiet: true, force: true });
    expect(result.exitCode).toBe(0);
    expect(readFileSync(join(dir, 'agent-policy.yaml'), 'utf8')).toMatch(/^version: 1/m);
  });
});
```

**Step 2: Run tests to verify fail**

Run: `npm test -- command-init`
Expected: FAIL.

**Step 3: Implement**

`src/commands/init.ts`:

```ts
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const TEMPLATE = `version: 1

project:
  name: my-repo
  description: ""

policy:
  sections:
    - id: overview
      title: Project overview
      body: |
        Describe what this repo does, its high-level architecture, and the top
        things an AI assistant needs to know to be useful here.
    - id: conventions
      title: Conventions
      body: |
        - Prefer small, focused modules.
        - Tests live alongside the code they test.

attribution:
  assisted_by:
    required: true
    format: "Assisted-by: {agent}:{model}"
    human_marker: "Assisted-by: n/a"
    allow_multiple: true

renderers:
  agents_md:
    enabled: true
    path: AGENTS.md
  claude_md:
    enabled: true
    path: CLAUDE.md
    concise: true
  copilot_instructions:
    enabled: true
    path: .github/copilot-instructions.md
    concise: true
`;

export interface InitOptions {
  cwd: string;
  json: boolean;
  quiet: boolean;
  force?: boolean;
}

export interface CommandResult {
  exitCode: number;
  message?: string;
}

export function runInit(opts: InitOptions): CommandResult {
  const target = join(opts.cwd, 'agent-policy.yaml');
  if (existsSync(target) && !opts.force) {
    if (!opts.quiet) {
      process.stderr.write(`agent-policy.yaml already exists at ${target}. Use --force to overwrite.\n`);
    }
    return { exitCode: 2, message: 'exists' };
  }
  writeFileSync(target, TEMPLATE, 'utf8');
  if (!opts.quiet) {
    process.stdout.write(`Wrote ${target}\n`);
  }
  return { exitCode: 0 };
}
```

**Step 4: Register in `src/cli.ts`**

Insert before `export function run(...)`:

```ts
import { runInit } from './commands/init.js';

program
  .command('init')
  .description('Scaffold agent-policy.yaml in the current directory')
  .option('--force', 'overwrite an existing file')
  .action((cmdOpts) => {
    const ctx = contextFromOpts(program.opts());
    const result = runInit({ ...ctx, force: Boolean(cmdOpts.force) });
    process.exit(result.exitCode);
  });
```

**Step 5: Run tests**

Run: `npm test`
Expected: pass.

**Step 6: Commit**

```bash
git add src/commands/init.ts src/cli.ts tests/command-init.test.ts
git commit -m "checkpoint(seq=4.2): init command with --force"
```

---

### Task 4.3: `validate` command

**Files:**
- Create: `src/commands/validate.ts`
- Modify: `src/cli.ts` (register)
- Create: `tests/command-validate.test.ts`

**Step 1: Write failing tests**

`tests/command-validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runValidate } from '../src/commands/validate.js';

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'agent-policy-validate-'));
}

describe('validate', () => {
  it('returns 0 for a valid config', () => {
    const dir = tmp();
    writeFileSync(
      join(dir, 'agent-policy.yaml'),
      'version: 1\npolicy:\n  sections:\n    - id: a\n      title: A\n      body: b\n',
    );
    const result = runValidate({ cwd: dir, json: false, quiet: true });
    expect(result.exitCode).toBe(0);
  });

  it('returns 1 for an invalid config', () => {
    const dir = tmp();
    writeFileSync(join(dir, 'agent-policy.yaml'), 'version: 2\n');
    const result = runValidate({ cwd: dir, json: false, quiet: true });
    expect(result.exitCode).toBe(1);
  });

  it('returns 1 when no config found', () => {
    const dir = tmp();
    const result = runValidate({ cwd: dir, json: false, quiet: true });
    expect(result.exitCode).toBe(1);
  });
});
```

**Step 2: Run tests to verify fail**

Run: `npm test -- command-validate`
Expected: FAIL.

**Step 3: Implement**

`src/commands/validate.ts`:

```ts
import { findConfigFile, loadConfigFromFile } from '../config/load.js';
import { validateConfig } from '../config/schema.js';
import type { CommandContext } from './types.js';

export interface CommandResult {
  exitCode: number;
}

export function runValidate(ctx: CommandContext): CommandResult {
  const path = ctx.configPath ?? findConfigFile(ctx.cwd);
  if (!path) {
    if (!ctx.quiet) process.stderr.write('agent-policy.yaml not found.\n');
    return { exitCode: 1 };
  }

  let config: unknown;
  try {
    config = loadConfigFromFile(path);
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n`);
    return { exitCode: 1 };
  }

  const result = validateConfig(config);
  if (result.ok) {
    if (!ctx.quiet) process.stdout.write(`${path}: OK\n`);
    return { exitCode: 0 };
  }

  if (ctx.json) {
    process.stdout.write(JSON.stringify({ path, errors: result.errors }, null, 2) + '\n');
  } else {
    process.stderr.write(`${path}: INVALID\n`);
    for (const e of result.errors) {
      process.stderr.write(`  ${e.path || '(root)'}: ${e.message}\n`);
    }
  }
  return { exitCode: 1 };
}
```

**Step 4: Register in `src/cli.ts`**

```ts
import { runValidate } from './commands/validate.js';

program
  .command('validate')
  .description('Parse and schema-validate agent-policy.yaml')
  .action(() => {
    const ctx = contextFromOpts(program.opts());
    const result = runValidate(ctx);
    process.exit(result.exitCode);
  });
```

**Step 5: Run tests**

Run: `npm test`
Expected: pass.

**Step 6: Commit**

```bash
git add src/commands/validate.ts src/cli.ts tests/command-validate.test.ts
git commit -m "checkpoint(seq=4.3): validate command"
```

---

### Task 4.4: `render` command

**Files:**
- Create: `src/commands/render.ts`
- Modify: `src/cli.ts` (register)
- Create: `tests/command-render.test.ts`

**Step 1: Write failing tests**

`tests/command-render.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, copyFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runRender } from '../src/commands/render.js';

function setupRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'agent-policy-render-'));
  copyFileSync(join(__dirname, 'fixtures/config-minimal.yaml'), join(dir, 'agent-policy.yaml'));
  return dir;
}

describe('render', () => {
  it('writes all enabled renderer outputs to stdout by default', () => {
    const dir = setupRepo();
    const writes: string[] = [];
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: any) => {
      writes.push(String(chunk));
      return true;
    });
    const result = runRender({ cwd: dir, json: false, quiet: false });
    spy.mockRestore();
    expect(result.exitCode).toBe(0);
    const out = writes.join('');
    expect(out).toContain('AGENTS.md');
    expect(out).toContain('CLAUDE.md');
    expect(out).toContain('copilot-instructions.md');
  });

  it('filters to one renderer with --renderer', () => {
    const dir = setupRepo();
    const writes: string[] = [];
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: any) => {
      writes.push(String(chunk));
      return true;
    });
    const result = runRender({ cwd: dir, json: false, quiet: false, renderer: 'agents_md' });
    spy.mockRestore();
    expect(result.exitCode).toBe(0);
    const out = writes.join('');
    expect(out).toContain('AGENTS.md');
    expect(out).not.toContain('CLAUDE.md');
  });
});
```

**Step 2: Run tests to verify fail**

Run: `npm test -- command-render`
Expected: FAIL.

**Step 3: Implement**

`src/commands/render.ts`:

```ts
import { findConfigFile, loadConfigFromFile } from '../config/load.js';
import { validateConfig } from '../config/schema.js';
import { getEnabledRenderers } from '../renderers/index.js';
import type { CommandContext } from './types.js';
import type { RendererId } from '../config/types.js';

export interface RenderOptions extends CommandContext {
  renderer?: string;
}

export interface CommandResult {
  exitCode: number;
}

export function runRender(opts: RenderOptions): CommandResult {
  const path = opts.configPath ?? findConfigFile(opts.cwd);
  if (!path) {
    process.stderr.write('agent-policy.yaml not found.\n');
    return { exitCode: 1 };
  }

  let parsed: unknown;
  try {
    parsed = loadConfigFromFile(path);
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n`);
    return { exitCode: 1 };
  }

  const result = validateConfig(parsed);
  if (!result.ok) {
    process.stderr.write('Invalid config.\n');
    for (const e of result.errors) process.stderr.write(`  ${e.path}: ${e.message}\n`);
    return { exitCode: 1 };
  }

  const enabled = getEnabledRenderers(result.config);
  const filtered = opts.renderer
    ? enabled.filter(({ renderer }) => renderer.id === (opts.renderer as RendererId))
    : enabled;

  if (filtered.length === 0) {
    process.stderr.write('No renderers matched.\n');
    return { exitCode: 1 };
  }

  for (const { renderer, path: rpath } of filtered) {
    process.stdout.write(`=== ${rpath} ===\n`);
    process.stdout.write(renderer.render(result.config));
    process.stdout.write('\n');
  }
  return { exitCode: 0 };
}
```

**Step 4: Register in `src/cli.ts`**

```ts
import { runRender } from './commands/render.js';

program
  .command('render')
  .description('Render enabled renderers to stdout')
  .option('--renderer <id>', 'render only this renderer (agents_md|claude_md|copilot_instructions)')
  .action((cmdOpts) => {
    const ctx = contextFromOpts(program.opts());
    const result = runRender({ ...ctx, renderer: cmdOpts.renderer });
    process.exit(result.exitCode);
  });
```

**Step 5: Run tests**

Run: `npm test`
Expected: pass.

**Step 6: Commit**

```bash
git add src/commands/render.ts src/cli.ts tests/command-render.test.ts
git commit -m "checkpoint(seq=4.4): render command"
```

---

## Milestone 5 — Write-side commands (sync + sync --check)

### Task 5.1: `sync` with banner guard

**Files:**
- Create: `src/commands/sync.ts`
- Create: `src/io/fs.ts`
- Modify: `src/cli.ts` (register)
- Create: `tests/command-sync.test.ts`

**Step 1: Write failing tests**

`tests/command-sync.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mkdtempSync, existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runSync } from '../src/commands/sync.js';
import { BANNER_FIRST_LINE } from '../src/renderers/common.js';

function setup(): string {
  const dir = mkdtempSync(join(tmpdir(), 'agent-policy-sync-'));
  copyFileSync(join(__dirname, 'fixtures/config-minimal.yaml'), join(dir, 'agent-policy.yaml'));
  return dir;
}

describe('sync (write mode)', () => {
  it('writes all enabled renderer outputs and creates parent dirs', () => {
    const dir = setup();
    const result = runSync({ cwd: dir, json: false, quiet: true });
    expect(result.exitCode).toBe(0);
    expect(existsSync(join(dir, 'AGENTS.md'))).toBe(true);
    expect(existsSync(join(dir, 'CLAUDE.md'))).toBe(true);
    expect(existsSync(join(dir, '.github', 'copilot-instructions.md'))).toBe(true);
    const agents = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    expect(agents.startsWith(BANNER_FIRST_LINE)).toBe(true);
  });

  it('refuses to overwrite a file lacking the banner', () => {
    const dir = setup();
    writeFileSync(join(dir, 'AGENTS.md'), 'hand-written content\n');
    const result = runSync({ cwd: dir, json: false, quiet: true });
    expect(result.exitCode).toBe(2);
    expect(readFileSync(join(dir, 'AGENTS.md'), 'utf8')).toBe('hand-written content\n');
  });

  it('overwrites with --force even without banner', () => {
    const dir = setup();
    writeFileSync(join(dir, 'AGENTS.md'), 'hand-written content\n');
    const result = runSync({ cwd: dir, json: false, quiet: true, force: true });
    expect(result.exitCode).toBe(0);
    expect(readFileSync(join(dir, 'AGENTS.md'), 'utf8').startsWith(BANNER_FIRST_LINE)).toBe(true);
  });

  it('happily overwrites a previously generated file (banner present)', () => {
    const dir = setup();
    runSync({ cwd: dir, json: false, quiet: true });
    const second = runSync({ cwd: dir, json: false, quiet: true });
    expect(second.exitCode).toBe(0);
  });
});
```

**Step 2: Run tests to verify fail**

Run: `npm test -- command-sync`
Expected: FAIL.

**Step 3: Implement FS helper**

`src/io/fs.ts`:

```ts
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { BANNER_FIRST_LINE } from '../renderers/common.js';

export function hasBanner(path: string): boolean {
  if (!existsSync(path)) return true; // writing a new file is fine
  try {
    const content = readFileSync(path, 'utf8');
    return content.startsWith(BANNER_FIRST_LINE);
  } catch {
    return false;
  }
}

export function writeFileEnsuringDir(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}
```

**Step 4: Implement sync**

`src/commands/sync.ts`:

```ts
import { join } from 'node:path';
import { findConfigFile, loadConfigFromFile } from '../config/load.js';
import { validateConfig } from '../config/schema.js';
import { getEnabledRenderers } from '../renderers/index.js';
import { hasBanner, writeFileEnsuringDir } from '../io/fs.js';
import type { CommandContext } from './types.js';

export interface SyncOptions extends CommandContext {
  force?: boolean;
}

export interface CommandResult {
  exitCode: number;
}

export function runSync(opts: SyncOptions): CommandResult {
  const cfgPath = opts.configPath ?? findConfigFile(opts.cwd);
  if (!cfgPath) {
    process.stderr.write('agent-policy.yaml not found.\n');
    return { exitCode: 1 };
  }

  let parsed: unknown;
  try {
    parsed = loadConfigFromFile(cfgPath);
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n`);
    return { exitCode: 1 };
  }
  const result = validateConfig(parsed);
  if (!result.ok) {
    process.stderr.write('Invalid config.\n');
    for (const e of result.errors) process.stderr.write(`  ${e.path}: ${e.message}\n`);
    return { exitCode: 1 };
  }

  const targets = getEnabledRenderers(result.config);

  if (!opts.force) {
    const clobbering = targets.filter(({ path }) => !hasBanner(join(opts.cwd, path)));
    if (clobbering.length > 0) {
      process.stderr.write('Refusing to overwrite files that do not carry the agent-policy banner:\n');
      for (const t of clobbering) process.stderr.write(`  ${t.path}\n`);
      process.stderr.write('Use --force to overwrite.\n');
      return { exitCode: 2 };
    }
  }

  for (const { renderer, path } of targets) {
    const abs = join(opts.cwd, path);
    const output = renderer.render(result.config);
    writeFileEnsuringDir(abs, output);
    if (!opts.quiet) process.stdout.write(`Wrote ${path}\n`);
  }
  return { exitCode: 0 };
}
```

**Step 5: Register in `src/cli.ts`**

```ts
import { runSync } from './commands/sync.js';

program
  .command('sync')
  .description('Render enabled renderers and write to disk')
  .option('--check', 'do not write; exit 1 if any file differs from rendered output')
  .option('--force', 'overwrite files that do not carry the agent-policy banner')
  .action((cmdOpts) => {
    const ctx = contextFromOpts(program.opts());
    if (cmdOpts.check) {
      // Handled by Task 5.2
      process.stderr.write('sync --check not yet implemented\n');
      process.exit(2);
    }
    const result = runSync({ ...ctx, force: Boolean(cmdOpts.force) });
    process.exit(result.exitCode);
  });
```

**Step 6: Run tests**

Run: `npm test`
Expected: pass.

**Step 7: Commit**

```bash
git add src/commands/sync.ts src/io/fs.ts src/cli.ts tests/command-sync.test.ts
git commit -m "checkpoint(seq=5.1): sync command with banner guard and --force"
```

---

### Task 5.2: `sync --check` (drift detection)

**Files:**
- Modify: `src/commands/sync.ts` (add `runSyncCheck`)
- Modify: `src/cli.ts` (wire --check)
- Create: `tests/command-sync-check.test.ts`

**Step 1: Write failing tests**

`tests/command-sync-check.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mkdtempSync, copyFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runSync, runSyncCheck } from '../src/commands/sync.js';

function setup(): string {
  const dir = mkdtempSync(join(tmpdir(), 'agent-policy-check-'));
  copyFileSync(join(__dirname, 'fixtures/config-minimal.yaml'), join(dir, 'agent-policy.yaml'));
  return dir;
}

describe('sync --check', () => {
  it('exits 0 when files are in sync', () => {
    const dir = setup();
    runSync({ cwd: dir, json: false, quiet: true });
    const result = runSyncCheck({ cwd: dir, json: false, quiet: true });
    expect(result.exitCode).toBe(0);
  });

  it('exits 1 when a file is missing', () => {
    const dir = setup();
    const result = runSyncCheck({ cwd: dir, json: false, quiet: true });
    expect(result.exitCode).toBe(1);
  });

  it('exits 1 when a file differs from rendered output', () => {
    const dir = setup();
    runSync({ cwd: dir, json: false, quiet: true });
    writeFileSync(join(dir, 'AGENTS.md'), 'tampered\n');
    const result = runSyncCheck({ cwd: dir, json: false, quiet: true });
    expect(result.exitCode).toBe(1);
  });
});
```

**Step 2: Run tests to verify fail**

Run: `npm test -- command-sync-check`
Expected: FAIL.

**Step 3: Implement**

Append to `src/commands/sync.ts`:

```ts
import { readFileSync, existsSync } from 'node:fs';

export function runSyncCheck(opts: CommandContext): CommandResult {
  const cfgPath = opts.configPath ?? findConfigFile(opts.cwd);
  if (!cfgPath) {
    process.stderr.write('agent-policy.yaml not found.\n');
    return { exitCode: 2 };
  }
  let parsed: unknown;
  try {
    parsed = loadConfigFromFile(cfgPath);
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n`);
    return { exitCode: 2 };
  }
  const result = validateConfig(parsed);
  if (!result.ok) {
    process.stderr.write('Invalid config.\n');
    for (const e of result.errors) process.stderr.write(`  ${e.path}: ${e.message}\n`);
    return { exitCode: 2 };
  }

  const targets = getEnabledRenderers(result.config);
  let drift = false;
  for (const { renderer, path } of targets) {
    const abs = join(opts.cwd, path);
    const expected = renderer.render(result.config);
    if (!existsSync(abs)) {
      process.stderr.write(`DRIFT: ${path} is missing.\n`);
      drift = true;
      continue;
    }
    const actual = readFileSync(abs, 'utf8');
    if (actual !== expected) {
      process.stderr.write(`DRIFT: ${path} differs from rendered output.\n`);
      drift = true;
    }
  }
  if (drift) return { exitCode: 1 };
  if (!opts.quiet) process.stdout.write('All renderer outputs are in sync.\n');
  return { exitCode: 0 };
}
```

Make sure the existing `import { existsSync } ...` line does not duplicate (consolidate imports at the top).

**Step 4: Wire into CLI**

Replace the `--check` branch in `src/cli.ts`:

```ts
if (cmdOpts.check) {
  const result = runSyncCheck(ctx);
  process.exit(result.exitCode);
}
```

Add `runSyncCheck` to the import.

**Step 5: Run tests**

Run: `npm test`
Expected: pass.

**Step 6: Commit**

```bash
git add src/commands/sync.ts src/cli.ts tests/command-sync-check.test.ts
git commit -m "checkpoint(seq=5.2): sync --check for drift detection"
```

---

## Milestone 6 — Commit-msg validation

### Task 6.1: Footer extractor utility

**Files:**
- Create: `src/io/commit.ts`
- Create: `tests/commit-extract.test.ts`

**Step 1: Write failing tests**

`tests/commit-extract.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { extractTrailers, stripComments } from '../src/io/commit.js';

describe('stripComments', () => {
  it('removes lines that start with #', () => {
    expect(stripComments('a\n# comment\nb\n')).toBe('a\nb\n');
  });
  it('keeps lines that have # in the middle', () => {
    expect(stripComments('a # not a comment\n')).toBe('a # not a comment\n');
  });
});

describe('extractTrailers', () => {
  it('returns trailers from the last paragraph', () => {
    const msg = 'subject\n\nbody\n\nAssisted-by: claude:opus-4-7\nSigned-off-by: Vivek\n';
    const trailers = extractTrailers(msg);
    expect(trailers.map((t) => t.key)).toEqual(['Assisted-by', 'Signed-off-by']);
  });

  it('ignores trailers that are not in the last paragraph', () => {
    const msg = 'subject\n\nAssisted-by: nope:fake\n\nthe actual body\n';
    const trailers = extractTrailers(msg);
    expect(trailers).toHaveLength(0);
  });

  it('handles a single-line message', () => {
    expect(extractTrailers('subject only')).toEqual([]);
  });

  it('handles multiple Assisted-by footers', () => {
    const msg = 'subject\n\nAssisted-by: claude:opus-4-7\nAssisted-by: copilot:v1\n';
    const trailers = extractTrailers(msg);
    expect(trailers.filter((t) => t.key === 'Assisted-by')).toHaveLength(2);
  });
});
```

**Step 2: Run tests to verify fail**

Run: `npm test -- commit-extract`
Expected: FAIL.

**Step 3: Implement**

`src/io/commit.ts`:

```ts
export function stripComments(source: string): string {
  return source
    .split('\n')
    .filter((line) => !line.startsWith('#'))
    .join('\n');
}

export interface Trailer {
  key: string;
  value: string;
  lineNumber: number; // 1-based, in original message
}

const TRAILER_RE = /^([A-Za-z][A-Za-z0-9-]*):\s+(.+)$/;

export function extractTrailers(message: string): Trailer[] {
  const cleaned = stripComments(message).replace(/\s+$/, '');
  const paragraphs = cleaned.split(/\n\s*\n/);
  const last = paragraphs[paragraphs.length - 1] ?? '';
  if (paragraphs.length < 2) return [];

  // Reject last paragraph as a trailer block if any line doesn't match the trailer shape.
  const lines = last.split('\n');
  const allTrailers = lines.every((l) => TRAILER_RE.test(l));
  if (!allTrailers) return [];

  // Compute line numbers in the ORIGINAL message.
  const originalLines = message.split('\n');
  const result: Trailer[] = [];
  for (const line of lines) {
    const m = line.match(TRAILER_RE);
    if (!m) continue;
    const key = m[1]!;
    const value = m[2]!;
    const lineNumber = originalLines.findIndex((l) => l === line) + 1;
    result.push({ key, value, lineNumber });
  }
  return result;
}
```

**Step 4: Run tests**

Run: `npm test`
Expected: pass.

**Step 5: Commit**

```bash
git add src/io/commit.ts tests/commit-extract.test.ts
git commit -m "checkpoint(seq=6.1): commit message trailer extractor"
```

---

### Task 6.2: `check-commit` command

**Files:**
- Create: `src/commands/check-commit.ts`
- Modify: `src/cli.ts` (register)
- Create: `tests/fixtures/commits/*.txt` (several)
- Create: `tests/command-check-commit.test.ts`

**Step 1: Create fixtures**

Create these files under `tests/fixtures/commits/`:

`valid-agent-model.txt`:

```
feat: add widget

Assisted-by: claude:opus-4-7
```

`valid-human-marker.txt`:

```
chore: tidy up

Assisted-by: n/a
```

`valid-multiple.txt`:

```
feat: hybrid

Assisted-by: claude:opus-4-7
Assisted-by: copilot:v1
```

`missing-footer.txt`:

```
feat: widget

the body does not end with an assisted-by footer
```

`malformed-footer.txt`:

```
feat: widget

Assisted-by: just-an-agent-no-colon
```

`trailer-not-last-paragraph.txt`:

```
feat: widget

Assisted-by: claude:opus-4-7

actual body goes here
```

**Step 2: Write failing tests**

`tests/command-check-commit.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mkdtempSync, copyFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCheckCommit } from '../src/commands/check-commit.js';

function setup(): string {
  const dir = mkdtempSync(join(tmpdir(), 'agent-policy-check-commit-'));
  copyFileSync(join(__dirname, 'fixtures/config-minimal.yaml'), join(dir, 'agent-policy.yaml'));
  return dir;
}

const FIXTURES = join(__dirname, 'fixtures/commits');

describe('check-commit', () => {
  const cases: Array<{ name: string; file: string; expected: number }> = [
    { name: 'valid agent:model', file: 'valid-agent-model.txt', expected: 0 },
    { name: 'valid human marker', file: 'valid-human-marker.txt', expected: 0 },
    { name: 'valid multiple', file: 'valid-multiple.txt', expected: 0 },
    { name: 'missing footer', file: 'missing-footer.txt', expected: 1 },
    { name: 'malformed footer', file: 'malformed-footer.txt', expected: 1 },
    { name: 'trailer not in last paragraph', file: 'trailer-not-last-paragraph.txt', expected: 1 },
  ];

  for (const c of cases) {
    it(c.name, () => {
      const dir = setup();
      const target = join(dir, 'MSG');
      copyFileSync(join(FIXTURES, c.file), target);
      const result = runCheckCommit({
        cwd: dir,
        json: false,
        quiet: true,
        messageFile: target,
      });
      expect(result.exitCode).toBe(c.expected);
    });
  }

  it('rejects multiple when allow_multiple: false', () => {
    const dir = setup();
    writeFileSync(
      join(dir, 'agent-policy.yaml'),
      'version: 1\nattribution:\n  assisted_by:\n    required: true\n    allow_multiple: false\n',
    );
    const target = join(dir, 'MSG');
    copyFileSync(join(FIXTURES, 'valid-multiple.txt'), target);
    const result = runCheckCommit({
      cwd: dir,
      json: false,
      quiet: true,
      messageFile: target,
    });
    expect(result.exitCode).toBe(1);
  });
});
```

**Step 3: Run tests to verify fail**

Run: `npm test -- command-check-commit`
Expected: FAIL.

**Step 4: Implement**

`src/commands/check-commit.ts`:

```ts
import { readFileSync } from 'node:fs';
import { findConfigFile, loadConfigFromFile } from '../config/load.js';
import { validateConfig } from '../config/schema.js';
import { extractTrailers } from '../io/commit.js';
import type { CommandContext } from './types.js';

export interface CheckCommitOptions extends CommandContext {
  messageFile: string; // file path, or '-' for stdin
}

export interface CommandResult {
  exitCode: number;
}

const AGENT_MODEL_RE = /^[A-Za-z0-9._-]+:[A-Za-z0-9._-]+$/;

export function runCheckCommit(opts: CheckCommitOptions): CommandResult {
  const cfgPath = opts.configPath ?? findConfigFile(opts.cwd);
  if (!cfgPath) {
    process.stderr.write('agent-policy.yaml not found.\n');
    return { exitCode: 1 };
  }
  const result = validateConfig(loadConfigFromFile(cfgPath));
  if (!result.ok) {
    process.stderr.write('Invalid config; cannot validate commit.\n');
    return { exitCode: 1 };
  }

  const ab = result.config.attribution?.assisted_by;
  const required = ab?.required !== false;
  const humanMarker = ab?.human_marker ?? 'Assisted-by: n/a';
  const allowMultiple = ab?.allow_multiple !== false;

  const source =
    opts.messageFile === '-' ? readFileSync(0, 'utf8') : readFileSync(opts.messageFile, 'utf8');
  const trailers = extractTrailers(source);
  const assistedBy = trailers.filter((t) => t.key === 'Assisted-by');

  if (required && assistedBy.length === 0) {
    process.stderr.write('Missing Assisted-by footer in commit message.\n');
    return { exitCode: 1 };
  }

  if (!allowMultiple && assistedBy.length > 1) {
    process.stderr.write(`allow_multiple is false but ${assistedBy.length} Assisted-by footers found.\n`);
    return { exitCode: 1 };
  }

  for (const t of assistedBy) {
    const line = `Assisted-by: ${t.value}`;
    const isHuman = line === humanMarker;
    const isAgentModel = AGENT_MODEL_RE.test(t.value);
    if (!isHuman && !isAgentModel) {
      process.stderr.write(
        `Malformed Assisted-by footer at line ${t.lineNumber}: "${line}"\n` +
          `Expected "${humanMarker}" or "Assisted-by: <agent>:<model>"\n`,
      );
      return { exitCode: 1 };
    }
  }

  if (!opts.quiet) process.stdout.write('Commit message OK.\n');
  return { exitCode: 0 };
}
```

**Step 5: Register in `src/cli.ts`**

```ts
import { runCheckCommit } from './commands/check-commit.js';

program
  .command('check-commit <messageFile>')
  .description('Validate a commit message file (use "-" for stdin)')
  .action((messageFile: string) => {
    const ctx = contextFromOpts(program.opts());
    const result = runCheckCommit({ ...ctx, messageFile });
    process.exit(result.exitCode);
  });
```

**Step 6: Run tests**

Run: `npm test`
Expected: pass.

**Step 7: Commit**

```bash
git add src/commands/check-commit.ts src/cli.ts tests/fixtures/commits/ tests/command-check-commit.test.ts
git commit -m "checkpoint(seq=6.2): check-commit command with fixture table"
```

---

## Milestone 7 — Hook install

### Task 7.1: Git hooks path resolution + install-hooks

**Files:**
- Create: `src/io/git.ts`
- Create: `src/commands/install-hooks.ts`
- Modify: `src/cli.ts` (register)
- Create: `tests/command-install-hooks.test.ts`

**Step 1: Write failing tests**

`tests/command-install-hooks.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mkdtempSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { runInstallHooks } from '../src/commands/install-hooks.js';

function setupRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'agent-policy-hooks-'));
  execSync('git init -q', { cwd: dir });
  return dir;
}

describe('install-hooks', () => {
  it('installs the commit-msg hook when none exists', () => {
    const dir = setupRepo();
    const result = runInstallHooks({ cwd: dir, json: false, quiet: true });
    expect(result.exitCode).toBe(0);
    const hookPath = join(dir, '.git', 'hooks', 'commit-msg');
    expect(existsSync(hookPath)).toBe(true);
    expect(readFileSync(hookPath, 'utf8')).toMatch(/agent-policy:commit-msg/);
  });

  it('is idempotent when already ours', () => {
    const dir = setupRepo();
    runInstallHooks({ cwd: dir, json: false, quiet: true });
    const result = runInstallHooks({ cwd: dir, json: false, quiet: true });
    expect(result.exitCode).toBe(0);
  });

  it('backs up a foreign hook', () => {
    const dir = setupRepo();
    const hookPath = join(dir, '.git', 'hooks', 'commit-msg');
    writeFileSync(hookPath, '#!/bin/sh\necho foreign\n');
    const result = runInstallHooks({ cwd: dir, json: false, quiet: true });
    expect(result.exitCode).toBe(0);
    expect(existsSync(hookPath + '.bak')).toBe(true);
    expect(readFileSync(hookPath + '.bak', 'utf8')).toMatch(/foreign/);
    expect(readFileSync(hookPath, 'utf8')).toMatch(/agent-policy:commit-msg/);
  });

  it('errors when a backup already exists (unless --force)', () => {
    const dir = setupRepo();
    const hookPath = join(dir, '.git', 'hooks', 'commit-msg');
    writeFileSync(hookPath, '#!/bin/sh\necho foreign\n');
    writeFileSync(hookPath + '.bak', 'prev backup');
    const result = runInstallHooks({ cwd: dir, json: false, quiet: true });
    expect(result.exitCode).toBe(1);

    const forced = runInstallHooks({ cwd: dir, json: false, quiet: true, force: true });
    expect(forced.exitCode).toBe(0);
  });
});
```

**Step 2: Run tests to verify fail**

Run: `npm test -- command-install-hooks`
Expected: FAIL (either because `git` needed, or module missing).

**Step 3: Implement git helper**

`src/io/git.ts`:

```ts
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

export function resolveHooksDir(cwd: string): string {
  const out = execFileSync('git', ['rev-parse', '--git-path', 'hooks'], {
    cwd,
    encoding: 'utf8',
  }).trim();
  return resolve(cwd, out);
}
```

**Step 4: Implement install-hooks**

`src/commands/install-hooks.ts`:

```ts
import { existsSync, readFileSync, writeFileSync, chmodSync, mkdirSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { resolveHooksDir } from '../io/git.js';
import type { CommandContext } from './types.js';

export interface InstallHooksOptions extends CommandContext {
  force?: boolean;
}

export interface CommandResult {
  exitCode: number;
}

const MARKER = '# agent-policy:commit-msg v1';

const HOOK_BODY = `#!/bin/sh
${MARKER}
exec agent-policy check-commit "$1"
`;

export function runInstallHooks(opts: InstallHooksOptions): CommandResult {
  let hooksDir: string;
  try {
    hooksDir = resolveHooksDir(opts.cwd);
  } catch (err) {
    process.stderr.write(`Unable to resolve git hooks directory: ${(err as Error).message}\n`);
    return { exitCode: 1 };
  }
  mkdirSync(hooksDir, { recursive: true });
  const hookPath = join(hooksDir, 'commit-msg');

  if (existsSync(hookPath)) {
    const current = readFileSync(hookPath, 'utf8');
    if (current.includes(MARKER)) {
      if (!opts.quiet) process.stdout.write(`commit-msg hook already installed at ${hookPath}\n`);
      return { exitCode: 0 };
    }
    const backup = hookPath + '.bak';
    if (existsSync(backup) && !opts.force) {
      process.stderr.write(
        `Foreign commit-msg hook found, but backup file ${backup} already exists. Use --force to overwrite the backup.\n`,
      );
      return { exitCode: 1 };
    }
    renameSync(hookPath, backup);
    if (!opts.quiet) process.stdout.write(`Backed up foreign hook to ${backup}\n`);
  }

  writeFileSync(hookPath, HOOK_BODY, 'utf8');
  chmodSync(hookPath, 0o755);
  if (!opts.quiet) process.stdout.write(`Installed commit-msg hook at ${hookPath}\n`);
  return { exitCode: 0 };
}
```

**Step 5: Register in `src/cli.ts`**

```ts
import { runInstallHooks } from './commands/install-hooks.js';

program
  .command('install-hooks')
  .description('Install the commit-msg hook that runs agent-policy check-commit')
  .option('--force', 'overwrite an existing .bak file when replacing a foreign hook')
  .action((cmdOpts) => {
    const ctx = contextFromOpts(program.opts());
    const result = runInstallHooks({ ...ctx, force: Boolean(cmdOpts.force) });
    process.exit(result.exitCode);
  });
```

**Step 6: Run tests**

Run: `npm test`
Expected: pass. Note: requires `git` on PATH. CI has it by default.

**Step 7: Commit**

```bash
git add src/io/git.ts src/commands/install-hooks.ts src/cli.ts tests/command-install-hooks.test.ts
git commit -m "checkpoint(seq=7.1): install-hooks command with backup logic"
```

---

## Milestone 8 — `agent47` Claude Code plugin

### Task 8.1: Plugin manifest and directory structure

**Files:**
- Create: `integrations/claude-code/agent47/.claude-plugin/plugin.json`
- Create: `integrations/claude-code/agent47/README.md`

**Step 1: Create `plugin.json`**

```json
{
  "name": "agent-policy",
  "version": "0.1.0",
  "description": "Keep AI coding-agent instruction files in sync and enforce commit attribution.",
  "homepage": "https://github.com/V-ivek/agent-policy",
  "commands": { "path": "./commands" },
  "skills": { "path": "./skills" }
}
```

**Step 2: Create plugin README**

```markdown
# agent47 — Claude Code plugin for agent-policy

This plugin lets you drive [`agent-policy`](https://github.com/V-ivek/agent-policy)
from a Claude Code session.

## Prerequisites

Install the CLI globally:

```
npm install -g @agent47/agent-policy
```

Or use `npx` from the repo: `npx @agent47/agent-policy ...`.

## Commands

- `/agent47:init` — scaffold `agent-policy.yaml`
- `/agent47:sync` — render enabled instruction files
- `/agent47:check` — drift-check generated files
- `/agent47:render` — render to stdout

## What Claude learns from this plugin

The included skill (`following-agent-policy`) teaches Claude to add the correct
`Assisted-by:` footer when it authors commits in a repository that has an
`agent-policy.yaml`, and to run `/agent47:sync` after editing the policy file.

## Install (local)

```
# From the agent-policy repository
cp -R integrations/claude-code/agent47 ~/.claude/plugins/
```

See `docs/claude-code-integration.md` for details.
```

**Step 3: Commit**

```bash
git add integrations/claude-code/agent47/
git commit -m "checkpoint(seq=8.1): agent47 plugin manifest and README"
```

---

### Task 8.2: Slash commands

**Files:**
- Create: `integrations/claude-code/agent47/commands/{init,sync,check,render}.md`

**Step 1: Write each command markdown**

`commands/init.md`:

```markdown
---
description: Scaffold an agent-policy.yaml in the current repo.
allowed-tools: Bash(agent-policy init:*)
---

Run `agent-policy init` in the current repository.

If the file already exists, stop and report that. Do not pass `--force` unless the user
explicitly asks for it — overwriting a config file is destructive.

After a successful init, summarize the file to the user in 3–5 lines and suggest running
`/agent47:sync`.
```

`commands/sync.md`:

```markdown
---
description: Render enabled agent-policy renderers to disk.
allowed-tools: Bash(agent-policy sync:*)
---

Run `agent-policy sync` in the current repository.

If the command exits with code 2 (would-clobber), inspect the listed files with the
user before deciding whether to pass `--force`. Do not pass `--force` without user
confirmation — the whole point is that these files are hand-authored by default.
```

`commands/check.md`:

```markdown
---
description: Drift-check generated instruction files against agent-policy.yaml.
allowed-tools: Bash(agent-policy sync --check:*)
---

Run `agent-policy sync --check` in the current repository.

- Exit 0: files are in sync. Report this briefly.
- Exit 1: drift detected. Show the command output and suggest `/agent47:sync`.
- Exit 2: config error. Surface the error to the user.
```

`commands/render.md`:

```markdown
---
description: Render agent-policy.yaml to stdout without writing to disk.
allowed-tools: Bash(agent-policy render:*)
---

Run `agent-policy render` in the current repository. If the user asks for a specific
renderer (AGENTS.md, CLAUDE.md, Copilot), pass `--renderer <id>` where id is one of
`agents_md`, `claude_md`, `copilot_instructions`.

Print the result to the user.
```

**Step 2: Commit**

```bash
git add integrations/claude-code/agent47/commands/
git commit -m "checkpoint(seq=8.2): agent47 slash commands"
```

---

### Task 8.3: Skill

**Files:**
- Create: `integrations/claude-code/agent47/skills/following-agent-policy/SKILL.md`

**Step 1: Create the skill**

```markdown
---
name: following-agent-policy
description: Use in any repository that contains an agent-policy.yaml. Teaches the correct Assisted-by commit footer and the sync workflow for generated instruction files.
---

# Following agent-policy

This skill applies whenever the current repository has an `agent-policy.yaml` at or above
the working directory.

## Commit attribution

Every commit you author must end with an `Assisted-by:` footer. Use the format configured
in `attribution.assisted_by.format` (default `Assisted-by: {agent}:{model}`):

```
feat: add widget

Assisted-by: claude:opus-4-7
```

If multiple agents contributed, emit one footer per agent (default `allow_multiple: true`).

If the commit is genuinely human-only (no AI assistance), use the configured
`human_marker` (default `Assisted-by: n/a`).

## After editing agent-policy.yaml

Generated instruction files (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`)
must be kept in sync. After any edit to `agent-policy.yaml`, run `/agent47:sync` (or
`agent-policy sync` directly) before committing.

## Checking drift

Before claiming a task is done in a repo with `agent-policy.yaml`, run `/agent47:check`
to ensure the generated files match the policy. If drift exists, run `/agent47:sync`
and include the regenerated files in the commit.

## What this skill does NOT do

- It does not replace the git `commit-msg` hook. If the hook is installed
  (`agent-policy install-hooks`), the hook is the authoritative enforcement.
- It does not invent attribution values. If you do not know the model version, ask
  the user rather than guessing.
```

**Step 2: Commit**

```bash
git add integrations/claude-code/agent47/skills/
git commit -m "checkpoint(seq=8.3): agent47 following-agent-policy skill"
```

---

### Task 8.4: Provisional marketplace manifest

**Files:**
- Create: `integrations/claude-code/agent47/marketplace/marketplace.json`
- Create: `integrations/claude-code/agent47/marketplace/README.md`

**Step 1: Create the manifest template**

```json
{
  "_note": "PROVISIONAL — template only. See marketplace/README.md before publishing.",
  "publisher": "agent47",
  "plugins": [
    {
      "name": "agent-policy",
      "version": "0.1.0",
      "description": "Keep AI coding-agent instruction files in sync and enforce commit attribution.",
      "homepage": "https://github.com/V-ivek/agent-policy",
      "source": "https://github.com/V-ivek/agent-policy"
    }
  ]
}
```

**Step 2: Create the marketplace README**

```markdown
# Marketplace manifest (provisional)

This directory contains a template `marketplace.json` for publishing the `agent47` publisher
with the `agent-policy` plugin on a Claude Code plugin marketplace.

## What is provisional

- `marketplace.json` is **not** a registered manifest. It is a template shape.
- The `agent47` publisher namespace is not currently registered on any Claude Code
  plugin marketplace. This file assumes the owner of this repository will register
  that namespace on a marketplace that supports it.

## Before publishing

1. Confirm the exact manifest schema your target marketplace expects. Edit this file
   to match.
2. Register the `agent47` publisher on that marketplace.
3. Host this file at the URL the marketplace requires.
4. Remove the `_note` field.

Until those steps are complete, the `integrations/claude-code/agent47/` directory works
fine as a locally-installable plugin; see the plugin `README.md`.
```

**Step 3: Commit**

```bash
git add integrations/claude-code/agent47/marketplace/
git commit -m "checkpoint(seq=8.4): provisional marketplace manifest template"
```

---

## Milestone 9 — Examples + docs

### Task 9.1: Minimal and full examples

**Files:**
- Create: `examples/minimal/agent-policy.yaml`
- Create: `examples/full/agent-policy.yaml`
- Create (after render): `examples/full/AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`

**Step 1: Copy minimal example**

`examples/minimal/agent-policy.yaml` — reuse the output of `agent-policy init`:

```yaml
version: 1
project:
  name: minimal-example
policy:
  sections:
    - id: overview
      title: Overview
      body: |
        Minimal example of an agent-policy config.
```

**Step 2: Write a full example**

`examples/full/agent-policy.yaml` — the full config from `docs/plans/2026-04-17-agent-policy-design.md` §4, adapted with realistic content (at least 3 sections, concise flags, attribution block).

**Step 3: Generate the outputs**

Run:

```bash
npm run build
cd examples/full && node ../../dist/cli.js sync
```

This writes the rendered `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md` into `examples/full/` so that the CI smoke test (`sync --check`) passes against them.

**Step 4: Commit**

```bash
git add examples/
git commit -m "checkpoint(seq=9.1): minimal and full examples"
```

---

### Task 9.2: README

**Files:**
- Modify: `README.md`

**Step 1: Rewrite `README.md`**

Replace the current one-line contents with a full README. Required sections, in order:

1. **Title + tagline + badges.** Badges: CI status, npm version, license. Example:
   - CI: `https://github.com/V-ivek/agent-policy/actions/workflows/ci.yml/badge.svg`
   - npm: `https://img.shields.io/npm/v/@agent47/agent-policy.svg`
   - license: `https://img.shields.io/badge/license-MIT-blue.svg`
2. **Why this exists.** 2–3 paragraphs describing the two problems (instruction file sprawl, inconsistent commit attribution) and the one-source-of-truth solution.
3. **Install.** `npm install -g @agent47/agent-policy` and `npx @agent47/agent-policy`.
4. **Quick start.** A five-step path: `init` → edit yaml → `sync` → `install-hooks` → commit with `Assisted-by:` footer.
5. **Example config.** Embed the minimal example verbatim.
6. **Example generated files.** Show the top ~10 lines of the generated `AGENTS.md` with the banner.
7. **Example commit attribution.** Valid and invalid commit messages side by side.
8. **Command reference.** Table of the 6 commands with one-line descriptions; link to `docs/commands.md`.
9. **Claude Code integration.** One paragraph + link to `docs/claude-code-integration.md`.
10. **Development.** `git clone`, `npm install`, `npm test`, `npm run build`.
11. **Contributing.** Link to `CONTRIBUTING.md`.
12. **License.** MIT, link to `LICENSE`.

Keep it ~150–250 lines. Use the elements-of-style skill's rules if needed: omit needless words, prefer active voice.

**Step 2: Commit**

```bash
git add README.md
git commit -m "checkpoint(seq=9.2): polished README"
```

---

### Task 9.3: `docs/` pages

**Files:**
- Create: `docs/getting-started.md`
- Create: `docs/configuration.md`
- Create: `docs/commands.md`
- Create: `docs/renderers.md`
- Create: `docs/commit-attribution.md`
- Create: `docs/claude-code-integration.md`
- Create: `docs/roadmap.md`

**Step 1: Draft each file**

Required content for each:

- **getting-started.md:** install → init → sync → install-hooks → first valid commit. Include exact copy-paste commands and expected output.
- **configuration.md:** every config key, type, default, and purpose. Tabular. Include the JSON Schema `$id` and a link to the schema file.
- **commands.md:** every command with flags, exit codes, and one example invocation with expected output.
- **renderers.md:** per-renderer structure, `concise` behavior, inclusion rules, the banner/hash contract.
- **commit-attribution.md:** valid footer shapes, multiple-footer rules, human marker, hook install, what happens at commit time, how to opt out (`required: false`).
- **claude-code-integration.md:** what the plugin does, how to install locally, slash command reference, skill description. Note the marketplace manifest is provisional.
- **roadmap.md:** copy from the design doc §13 "Open questions (deferred)" — all stretch items for v0.2+.

**Step 2: Commit**

```bash
git add docs/
git commit -m "checkpoint(seq=9.3): user and integration docs"
```

---

### Task 9.4: Contributing, code of conduct, changelog

**Files:**
- Create: `CONTRIBUTING.md`
- Create: `CODE_OF_CONDUCT.md`
- Create: `CHANGELOG.md`

**Step 1: CONTRIBUTING.md**

Cover: reporting bugs, proposing features, dev setup, running tests, code style (eslint + prettier), how to add a new renderer (link to `src/renderers/index.ts` interface), commit style (`Assisted-by:` footer expected).

**Step 2: CODE_OF_CONDUCT.md**

Use the Contributor Covenant 2.1 verbatim.

**Step 3: CHANGELOG.md**

Use Keep a Changelog format. Start:

```
# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/) and this project adheres to
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] — 2026-04-17

### Added
- Canonical `agent-policy.yaml` schema (v1) with Ajv validation.
- CLI commands: `init`, `validate`, `render`, `sync`, `sync --check`, `check-commit`, `install-hooks`.
- Renderers: `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md` with concise filtering.
- Generated banner with SHA-256 hash of rendered body.
- Commit-msg hook that enforces `Assisted-by:` attribution.
- `agent47` Claude Code plugin with four slash commands and a skill.
- Provisional marketplace manifest template.
```

**Step 4: Commit**

```bash
git add CONTRIBUTING.md CODE_OF_CONDUCT.md CHANGELOG.md
git commit -m "checkpoint(seq=9.4): CONTRIBUTING, code of conduct, CHANGELOG"
```

---

## Milestone 10 — Release polish

### Task 10.1: Issue and PR templates

**Files:**
- Create: `.github/ISSUE_TEMPLATE/bug_report.md`
- Create: `.github/ISSUE_TEMPLATE/feature_request.md`
- Create: `.github/ISSUE_TEMPLATE/config.yml`
- Create: `.github/pull_request_template.md`

**Step 1: Write bug_report.md**

```markdown
---
name: Bug report
about: Report a reproducible problem
labels: bug
---

**What happened?**

**What did you expect to happen?**

**Reproduction**

1. ...
2. ...

**Environment**

- `agent-policy` version:
- Node version:
- OS:

**`agent-policy.yaml` (minimal repro)**

```yaml
# paste here
```
```

**Step 2: Write feature_request.md**

```markdown
---
name: Feature request
about: Propose a new capability or change
labels: enhancement
---

**Problem**

What problem would this solve?

**Proposed solution**

**Alternatives considered**

**Would you be willing to contribute a PR?**
```

**Step 3: Write config.yml (disable blank issues)**

```yaml
blank_issues_enabled: false
```

**Step 4: Write pull_request_template.md**

```markdown
## Summary

## Test plan

- [ ] `npm test`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`

## Checklist

- [ ] Updated CHANGELOG.md under `[Unreleased]`
- [ ] Updated docs if behavior changed
- [ ] Commit messages end with `Assisted-by:` footer
```

**Step 5: Commit**

```bash
git add .github/ISSUE_TEMPLATE/ .github/pull_request_template.md
git commit -m "checkpoint(seq=10.1): issue and PR templates"
```

---

### Task 10.2: Release workflow

**Files:**
- Create: `.github/workflows/release.yml`

**Step 1: Write the workflow**

```yaml
name: Release

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm publish --access public --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      - uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
```

**Step 2: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "checkpoint(seq=10.2): release workflow for npm + GitHub Release"
```

---

### Task 10.3: Full repo verification

**Step 1: Run the full CI path locally**

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
( cd examples/full && node ../../dist/cli.js sync --check )
```

All must succeed.

**Step 2: Sanity-check the published package surface**

Run: `npm pack --dry-run`
Expected: only `dist/`, `schemas/`, `LICENSE`, `README.md`, `package.json`. No `src/`, no `tests/`, no `docs/`.

**Step 3: No commit required unless something needed fixing.** If fixes were required, commit them:

```bash
git add -A
git commit -m "checkpoint(seq=10.3): repo verification fixes"
```

---

## Milestone 11 — Summary and push instructions

### Task 11.1: Summary document

**Files:**
- Create: `docs/plans/2026-04-17-agent-policy-summary.md`

**Step 1: Write the summary**

Include:
- What was built (by milestone).
- Architecture decisions made during execution that diverged from the design (if any).
- Known limitations.
- Test coverage overview (line/branch counts if easy to produce).
- Exactly how to use the CLI end-to-end.
- Exact `git` commands to push to GitHub.

Exact push sequence at the end of the summary:

```bash
# If no remote yet:
git remote add origin git@github.com:V-ivek/agent-policy.git

# Confirm we're on main and branch is ready:
git status
git log --oneline -20

# Push:
git push -u origin main

# Tag the release and push the tag:
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
```

**Step 2: Commit**

```bash
git add docs/plans/2026-04-17-agent-policy-summary.md
git commit -m "checkpoint(seq=11.1): summary and push instructions"
```

---

### Task 11.2: Offer the final squash

Ask the user:

> Implementation complete. I created N checkpoint commits. Do you want me to squash them into one Conventional Commit with an `Assisted-by: claude:opus-4-7` footer?

If yes:

```bash
# Count commits since the initial commit
git log --oneline e51334f..HEAD | wc -l
# Squash: interactive rebase or soft reset + recommit
git reset --soft e51334f
git commit -m "$(cat <<'EOF'
feat: initial agent-policy release (v0.1.0)

Ships the agent-policy CLI (init, validate, render, sync, sync --check,
check-commit, install-hooks), renderers for AGENTS.md / CLAUDE.md /
copilot-instructions.md, commit-msg hook installer, a Claude Code
plugin (agent47) with four slash commands and a skill, full docs,
examples, and CI + release workflows.

Assisted-by: claude:opus-4-7
EOF
)"
```

`e51334f` is the current initial commit SHA (from `git log` at the start of this plan). If squashing is declined, leave the checkpoint history.

---

## Verification checklist

Before announcing completion, confirm:

- [ ] `npm test` passes locally (all milestones' tests green).
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` produces `dist/cli.js` with a shebang.
- [ ] `node dist/cli.js --help` lists all 6 commands.
- [ ] `cd examples/full && node ../../dist/cli.js sync --check` exits 0.
- [ ] `npm pack --dry-run` shows only `dist/`, `schemas/`, `LICENSE`, `README.md`, `package.json`.
- [ ] `integrations/claude-code/agent47/.claude-plugin/plugin.json` is valid JSON.
- [ ] `docs/plans/2026-04-17-agent-policy-summary.md` exists with exact push commands.
- [ ] All checkpoint commits use the `checkpoint(seq=N.M): ...` subject format.

---

## Skills to use during execution

- **superpowers:executing-plans** — the top-level execution discipline.
- **superpowers:test-driven-development** — TDD loop for every implementation task.
- **superpowers:verification-before-completion** — never claim done without running the verification command.
- **superpowers:systematic-debugging** — if any test fails unexpectedly, stop and diagnose root cause before changing production code.
- **superpowers:requesting-code-review** — before announcing the milestone complete, request review.

If a task's tests fail for a reason outside TDD's expected failure path (i.e., not "missing function / missing file"), stop and invoke `superpowers:systematic-debugging`.

---

## YAGNI guardrails for this plan

- No JSON Schema export command. Deferred.
- No Conventional Commit validation on subject lines. Deferred.
- No checkpoint-commit subject-format validation. Deferred.
- No dry-run on `sync`. Deferred.
- No Cursor Rules renderer. Deferred.
- No Husky/Lefthook/pre-commit examples. Deferred.
- No GitHub Action example consuming `agent-policy`. Deferred.

Adding any of the above in this pass is scope creep. They live in `docs/roadmap.md`.
