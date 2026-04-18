import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfigFromString } from '../src/config/load.js';
import { validateConfig } from '../src/config/schema.js';
import { RENDERERS, getEnabledRenderers } from '../src/renderers/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
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

  it('getEnabledRenderers respects enabled=false', () => {
    const parsed = loadConfigFromString(source);
    const result = validateConfig(parsed);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const disabled = {
      ...result.config,
      renderers: {
        ...result.config.renderers,
        claude_md: { ...result.config.renderers?.claude_md, enabled: false },
      },
    };
    const enabled = getEnabledRenderers(disabled);
    expect(enabled.map((e) => e.renderer.id)).not.toContain('claude_md');
  });

  it('getEnabledRenderers uses configured path over default', () => {
    const parsed = loadConfigFromString(source);
    const result = validateConfig(parsed);
    if (!result.ok) throw new Error('fixture invalid');
    const enabled = getEnabledRenderers(result.config);
    const agents = enabled.find((e) => e.renderer.id === 'agents_md');
    expect(agents?.path).toBe('AGENTS.md');
  });
});
