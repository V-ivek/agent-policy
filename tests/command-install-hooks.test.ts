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
    expect(readFileSync(hookPath, 'utf8')).toMatch(/agent-policy:commit-msg/);
  });
});
