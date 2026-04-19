import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfigFromString } from '../src/config/load.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
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
