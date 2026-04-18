import { findConfigFile, loadConfigFromFile } from '../config/load.js';
import { validateConfig } from '../config/schema.js';
import type { CommandContext, CommandResult } from './types.js';

export function runValidate(ctx: CommandContext): CommandResult {
  const path = ctx.configPath ?? findConfigFile(ctx.cwd);
  if (!path) {
    if (!ctx.quiet) process.stderr.write('agent-policy.yaml not found.\n');
    return { exitCode: 1 };
  }

  let config: unknown;
  try {
    config = loadConfigFromFile(path);
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n`);
    return { exitCode: 1 };
  }

  const result = validateConfig(config);
  if (result.ok) {
    if (!ctx.quiet) process.stdout.write(`${path}: OK\n`);
    return { exitCode: 0 };
  }

  if (ctx.json) {
    process.stdout.write(JSON.stringify({ path, errors: result.errors }, null, 2) + '\n');
  } else {
    process.stderr.write(`${path}: INVALID\n`);
    for (const e of result.errors) {
      process.stderr.write(`  ${e.path || '(root)'}: ${e.message}\n`);
    }
  }
  return { exitCode: 1 };
}
