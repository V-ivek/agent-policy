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

  it('validates the output of runInit', async () => {
    const { runInit } = await import('../src/commands/init.js');
    const dir = tmp();
    expect(runInit({ cwd: dir, json: false, quiet: true }).exitCode).toBe(0);
    expect(runValidate({ cwd: dir, json: false, quiet: true }).exitCode).toBe(0);
  });
});
