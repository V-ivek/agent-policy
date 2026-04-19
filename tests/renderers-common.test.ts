import { describe, it, expect } from 'vitest';
import { wrapWithBanner, bodyHash, stripBanner, BANNER_FIRST_LINE } from '../src/renderers/common.js';

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

  it('stripBanner reverses wrapWithBanner for hash + body', () => {
    const body = '# Hi\n\nbody text\n';
    const out = wrapWithBanner(body);
    const stripped = stripBanner(out);
    expect(stripped.hash).toBe(bodyHash(body));
    expect(stripped.body).toBe(body);
  });

  it('stripBanner returns null hash for files lacking the banner', () => {
    const stripped = stripBanner('hand-written\n');
    expect(stripped.hash).toBe(null);
    expect(stripped.body).toBe('hand-written\n');
  });
});
