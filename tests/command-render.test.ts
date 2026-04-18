import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runRender } from '../src/commands/render.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function setupRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'agent-policy-render-'));
  copyFileSync(join(__dirname, 'fixtures/config-minimal.yaml'), join(dir, 'agent-policy.yaml'));
  return dir;
}

function captureStdout(fn: () => void): string {
  const writes: string[] = [];
  const spy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: string | Uint8Array): boolean => {
      writes.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
      return true;
    });
  try {
    fn();
  } finally {
    spy.mockRestore();
  }
  return writes.join('');
}

describe('render', () => {
  it('writes all enabled renderer outputs to stdout by default', () => {
    const dir = setupRepo();
    let result: { exitCode: number } = { exitCode: -1 };
    const out = captureStdout(() => {
      result = runRender({ cwd: dir, json: false, quiet: false });
    });
    expect(result.exitCode).toBe(0);
    expect(out).toContain('AGENTS.md');
    expect(out).toContain('CLAUDE.md');
    expect(out).toContain('copilot-instructions.md');
  });

  it('filters to one renderer with --renderer', () => {
    const dir = setupRepo();
    let result: { exitCode: number } = { exitCode: -1 };
    const out = captureStdout(() => {
      result = runRender({ cwd: dir, json: false, quiet: false, renderer: 'agents_md' });
    });
    expect(result.exitCode).toBe(0);
    expect(out).toContain('AGENTS.md');
    expect(out).not.toContain('CLAUDE.md');
  });

  it('exits 1 when the requested renderer does not match any enabled id', () => {
    const dir = setupRepo();
    const result = runRender({ cwd: dir, json: false, quiet: true, renderer: 'no_such_renderer' });
    expect(result.exitCode).toBe(1);
  });
});
