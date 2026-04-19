import { describe, it, expect } from 'vitest';
import { mkdtempSync, existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSync } from '../src/commands/sync.js';
import { BANNER_FIRST_LINE } from '../src/renderers/common.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function setup(): string {
  const dir = mkdtempSync(join(tmpdir(), 'agent-policy-sync-'));
  copyFileSync(join(__dirname, 'fixtures/config-minimal.yaml'), join(dir, 'agent-policy.yaml'));
  return dir;
}

describe('sync (write mode)', () => {
  it('writes all enabled renderer outputs and creates parent dirs', () => {
    const dir = setup();
    const result = runSync({ cwd: dir, json: false, quiet: true });
    expect(result.exitCode).toBe(0);
    expect(existsSync(join(dir, 'AGENTS.md'))).toBe(true);
    expect(existsSync(join(dir, 'CLAUDE.md'))).toBe(true);
    expect(existsSync(join(dir, '.github', 'copilot-instructions.md'))).toBe(true);
    const agents = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    expect(agents.startsWith(BANNER_FIRST_LINE)).toBe(true);
  });

  it('refuses to overwrite a file lacking the banner', () => {
    const dir = setup();
    writeFileSync(join(dir, 'AGENTS.md'), 'hand-written content\n');
    const result = runSync({ cwd: dir, json: false, quiet: true });
    expect(result.exitCode).toBe(2);
    expect(readFileSync(join(dir, 'AGENTS.md'), 'utf8')).toBe('hand-written content\n');
  });

  it('overwrites with --force even without banner', () => {
    const dir = setup();
    writeFileSync(join(dir, 'AGENTS.md'), 'hand-written content\n');
    const result = runSync({ cwd: dir, json: false, quiet: true, force: true });
    expect(result.exitCode).toBe(0);
    expect(readFileSync(join(dir, 'AGENTS.md'), 'utf8').startsWith(BANNER_FIRST_LINE)).toBe(true);
  });

  it('happily overwrites a previously generated file (banner present)', () => {
    const dir = setup();
    runSync({ cwd: dir, json: false, quiet: true });
    const second = runSync({ cwd: dir, json: false, quiet: true });
    expect(second.exitCode).toBe(0);
  });
});
