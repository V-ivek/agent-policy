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
