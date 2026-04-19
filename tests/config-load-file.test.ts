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
