import { readFileSync } from 'node:fs';
import { findConfigFile, loadConfigFromFile } from '../config/load.js';
import { validateConfig } from '../config/schema.js';
import { extractTrailers } from '../io/commit.js';
import type { CommandContext, CommandResult } from './types.js';

export interface CheckCommitOptions extends CommandContext {
  messageFile: string; // file path, or '-' for stdin
}

const AGENT_MODEL_RE = /^[A-Za-z0-9._-]+:[A-Za-z0-9._-]+$/;

export function runCheckCommit(opts: CheckCommitOptions): CommandResult {
  const cfgPath = opts.configPath ?? findConfigFile(opts.cwd);
  if (!cfgPath) {
    process.stderr.write('agent-policy.yaml not found.\n');
    return { exitCode: 1 };
  }

  let parsed: unknown;
  try {
    parsed = loadConfigFromFile(cfgPath);
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n`);
    return { exitCode: 1 };
  }
  const result = validateConfig(parsed);
  if (!result.ok) {
    process.stderr.write('Invalid config; cannot validate commit.\n');
    return { exitCode: 1 };
  }

  const ab = result.config.attribution?.assisted_by;
  const required = ab?.required !== false;
  const humanMarker = ab?.human_marker ?? 'Assisted-by: n/a';
  const allowMultiple = ab?.allow_multiple !== false;

  const source =
    opts.messageFile === '-'
      ? readFileSync(0, 'utf8')
      : readFileSync(opts.messageFile, 'utf8');
  const trailers = extractTrailers(source);
  const assistedBy = trailers.filter((t) => t.key === 'Assisted-by');

  if (required && assistedBy.length === 0) {
    process.stderr.write('Missing Assisted-by footer in commit message.\n');
    return { exitCode: 1 };
  }

  if (!allowMultiple && assistedBy.length > 1) {
    process.stderr.write(
      `allow_multiple is false but ${assistedBy.length} Assisted-by footers found.\n`,
    );
    return { exitCode: 1 };
  }

  for (const t of assistedBy) {
    const line = `Assisted-by: ${t.value}`;
    const isHuman = line === humanMarker;
    const isAgentModel = AGENT_MODEL_RE.test(t.value);
    if (!isHuman && !isAgentModel) {
      process.stderr.write(
        `Malformed Assisted-by footer at line ${t.lineNumber}: "${line}"\n` +
          `Expected "${humanMarker}" or "Assisted-by: <agent>:<model>".\n`,
      );
      return { exitCode: 1 };
    }
  }

  if (!opts.quiet) process.stdout.write('Commit message OK.\n');
  return { exitCode: 0 };
}
