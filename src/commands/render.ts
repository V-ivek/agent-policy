import { findConfigFile, loadConfigFromFile } from '../config/load.js';
import { validateConfig } from '../config/schema.js';
import { getEnabledRenderers } from '../renderers/index.js';
import type { CommandContext, CommandResult } from './types.js';

export interface RenderOptions extends CommandContext {
  renderer?: string;
}

export function runRender(opts: RenderOptions): CommandResult {
  const path = opts.configPath ?? findConfigFile(opts.cwd);
  if (!path) {
    process.stderr.write('agent-policy.yaml not found.\n');
    return { exitCode: 1 };
  }

  let parsed: unknown;
  try {
    parsed = loadConfigFromFile(path);
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n`);
    return { exitCode: 1 };
  }

  const result = validateConfig(parsed);
  if (!result.ok) {
    process.stderr.write('Invalid config.\n');
    for (const e of result.errors) process.stderr.write(`  ${e.path}: ${e.message}\n`);
    return { exitCode: 1 };
  }

  const enabled = getEnabledRenderers(result.config);
  const filtered = opts.renderer
    ? enabled.filter(({ renderer }) => renderer.id === opts.renderer)
    : enabled;

  if (filtered.length === 0) {
    process.stderr.write('No renderers matched.\n');
    return { exitCode: 1 };
  }

  for (const { renderer, path: rpath } of filtered) {
    process.stdout.write(`=== ${rpath} ===\n`);
    process.stdout.write(renderer.render(result.config));
    process.stdout.write('\n');
  }
  return { exitCode: 0 };
}
