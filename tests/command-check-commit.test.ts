import { describe, it, expect } from 'vitest';
import { mkdtempSync, copyFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCheckCommit } from '../src/commands/check-commit.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, 'fixtures/commits');

function setup(): string {
  const dir = mkdtempSync(join(tmpdir(), 'agent-policy-check-commit-'));
  copyFileSync(join(__dirname, 'fixtures/config-minimal.yaml'), join(dir, 'agent-policy.yaml'));
  return dir;
}

describe('check-commit', () => {
  const cases: Array<{ name: string; file: string; expected: number }> = [
    { name: 'valid agent:model', file: 'valid-agent-model.txt', expected: 0 },
    { name: 'valid human marker', file: 'valid-human-marker.txt', expected: 0 },
    { name: 'valid multiple', file: 'valid-multiple.txt', expected: 0 },
    { name: 'missing footer', file: 'missing-footer.txt', expected: 1 },
    { name: 'malformed footer', file: 'malformed-footer.txt', expected: 1 },
    { name: 'trailer not in last paragraph', file: 'trailer-not-last-paragraph.txt', expected: 1 },
  ];

  for (const c of cases) {
    it(c.name, () => {
      const dir = setup();
      const target = join(dir, 'MSG');
      copyFileSync(join(FIXTURES, c.file), target);
      const result = runCheckCommit({
        cwd: dir,
        json: false,
        quiet: true,
        messageFile: target,
      });
      expect(result.exitCode).toBe(c.expected);
    });
  }

  it('rejects multiple when allow_multiple: false', () => {
    const dir = setup();
    writeFileSync(
      join(dir, 'agent-policy.yaml'),
      'version: 1\nattribution:\n  assisted_by:\n    required: true\n    allow_multiple: false\n',
    );
    const target = join(dir, 'MSG');
    copyFileSync(join(FIXTURES, 'valid-multiple.txt'), target);
    const result = runCheckCommit({
      cwd: dir,
      json: false,
      quiet: true,
      messageFile: target,
    });
    expect(result.exitCode).toBe(1);
  });

  it('accepts a message with no footer when required: false', () => {
    const dir = setup();
    writeFileSync(
      join(dir, 'agent-policy.yaml'),
      'version: 1\nattribution:\n  assisted_by:\n    required: false\n',
    );
    const target = join(dir, 'MSG');
    copyFileSync(join(FIXTURES, 'missing-footer.txt'), target);
    const result = runCheckCommit({
      cwd: dir,
      json: false,
      quiet: true,
      messageFile: target,
    });
    expect(result.exitCode).toBe(0);
  });
});
