import { existsSync, readFileSync, writeFileSync, chmodSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { resolveHooksDir } from '../io/git.js';
import type { CommandContext, CommandResult } from './types.js';

export interface InstallHooksOptions extends CommandContext {
  force?: boolean;
}

const MARKER = '# agent-policy:commit-msg v1';

const HOOK_BODY = `#!/bin/sh
${MARKER}
exec agent-policy check-commit "$1"
`;

export function runInstallHooks(opts: InstallHooksOptions): CommandResult {
  let hooksDir: string;
  try {
    hooksDir = resolveHooksDir(opts.cwd);
  } catch (err) {
    process.stderr.write(
      `Unable to resolve git hooks directory: ${(err as Error).message}\n`,
    );
    return { exitCode: 1 };
  }
  mkdirSync(hooksDir, { recursive: true });
  const hookPath = join(hooksDir, 'commit-msg');

  if (existsSync(hookPath)) {
    const current = readFileSync(hookPath, 'utf8');
    if (current.includes(MARKER)) {
      if (!opts.quiet) {
        process.stdout.write(`commit-msg hook already installed at ${hookPath}\n`);
      }
      return { exitCode: 0 };
    }
    const backup = hookPath + '.bak';
    if (existsSync(backup) && !opts.force) {
      process.stderr.write(
        `Foreign commit-msg hook found, but backup file ${backup} already exists. ` +
          `Use --force to overwrite the backup.\n`,
      );
      return { exitCode: 1 };
    }
    renameSync(hookPath, backup);
    if (!opts.quiet) process.stdout.write(`Backed up foreign hook to ${backup}\n`);
  }

  writeFileSync(hookPath, HOOK_BODY, 'utf8');
  chmodSync(hookPath, 0o755);
  if (!opts.quiet) process.stdout.write(`Installed commit-msg hook at ${hookPath}\n`);
  return { exitCode: 0 };
}
