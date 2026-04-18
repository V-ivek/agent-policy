import { describe, it, expect } from 'vitest';
import { mkdtempSync, copyFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSync, runSyncCheck } from '../src/commands/sync.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

  it('exits 2 on config error (missing yaml)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'agent-policy-check-no-cfg-'));
    const result = runSyncCheck({ cwd: dir, json: false, quiet: true });
    expect(result.exitCode).toBe(2);
  });
});
