import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findConfigFile, loadConfigFromFile } from '../config/load.js';
import { validateConfig } from '../config/schema.js';
import { getEnabledRenderers } from '../renderers/index.js';
import { hasBanner, writeFileEnsuringDir } from '../io/fs.js';
import type { CommandContext, CommandResult } from './types.js';

export interface SyncOptions extends CommandContext {
  force?: boolean;
}

function loadAndValidate(opts: CommandContext): {
  ok: true;
  config: import('../config/types.js').AgentPolicyConfig;
} | { ok: false; exitCode: number } {
  const cfgPath = opts.configPath ?? findConfigFile(opts.cwd);
  if (!cfgPath) {
    process.stderr.write('agent-policy.yaml not found.\n');
    return { ok: false, exitCode: 2 };
  }
  let parsed: unknown;
  try {
    parsed = loadConfigFromFile(cfgPath);
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n`);
    return { ok: false, exitCode: 2 };
  }
  const result = validateConfig(parsed);
  if (!result.ok) {
    process.stderr.write('Invalid config.\n');
    for (const e of result.errors) process.stderr.write(`  ${e.path}: ${e.message}\n`);
    return { ok: false, exitCode: 2 };
  }
  return { ok: true, config: result.config };
}

export function runSync(opts: SyncOptions): CommandResult {
  const loaded = loadAndValidate(opts);
  if (!loaded.ok) return { exitCode: loaded.exitCode === 2 ? 1 : loaded.exitCode };

  const targets = getEnabledRenderers(loaded.config);

  if (!opts.force) {
    const clobbering = targets.filter(({ path }) => !hasBanner(join(opts.cwd, path)));
    if (clobbering.length > 0) {
      process.stderr.write(
        'Refusing to overwrite files that do not carry the agent-policy banner:\n',
      );
      for (const t of clobbering) process.stderr.write(`  ${t.path}\n`);
      process.stderr.write('Use --force to overwrite.\n');
      return { exitCode: 2 };
    }
  }

  for (const { renderer, path } of targets) {
    const abs = join(opts.cwd, path);
    const output = renderer.render(loaded.config);
    writeFileEnsuringDir(abs, output);
    if (!opts.quiet) process.stdout.write(`Wrote ${path}\n`);
  }
  return { exitCode: 0 };
}

export function runSyncCheck(opts: CommandContext): CommandResult {
  const loaded = loadAndValidate(opts);
  if (!loaded.ok) return { exitCode: loaded.exitCode };

  const targets = getEnabledRenderers(loaded.config);
  let drift = false;
  for (const { renderer, path } of targets) {
    const abs = join(opts.cwd, path);
    const expected = renderer.render(loaded.config);
    if (!existsSync(abs)) {
      process.stderr.write(`DRIFT: ${path} is missing.\n`);
      drift = true;
      continue;
    }
    const actual = readFileSync(abs, 'utf8');
    if (actual !== expected) {
      process.stderr.write(`DRIFT: ${path} differs from rendered output.\n`);
      drift = true;
    }
  }
  if (drift) return { exitCode: 1 };
  if (!opts.quiet) process.stdout.write('All renderer outputs are in sync.\n');
  return { exitCode: 0 };
}
