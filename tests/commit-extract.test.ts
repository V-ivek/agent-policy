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

  it('skips git-style comment lines in the commit message', () => {
    const msg =
      'subject\n\n# Please enter the commit message for your changes.\n# Lines starting with # will be ignored.\nAssisted-by: claude:opus-4-7\n';
    const trailers = extractTrailers(msg);
    expect(trailers.map((t) => t.key)).toEqual(['Assisted-by']);
  });

  it('reports the 1-based line number from the original message', () => {
    const msg = 'subject\n\nbody\n\nAssisted-by: claude:opus-4-7\n';
    const trailers = extractTrailers(msg);
    // Line 5 (1-based): subject=1, ''=2, body=3, ''=4, Assisted-by=5
    expect(trailers[0]?.lineNumber).toBe(5);
  });
});
