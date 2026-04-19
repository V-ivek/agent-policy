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
