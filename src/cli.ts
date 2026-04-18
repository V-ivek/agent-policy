import { Command } from 'commander';
import { resolve } from 'node:path';
import type { CommandContext } from './commands/types.js';
import { runInit } from './commands/init.js';
import { runValidate } from './commands/validate.js';
import { runRender } from './commands/render.js';
import { runSync, runSyncCheck } from './commands/sync.js';
import { runCheckCommit } from './commands/check-commit.js';
import { runInstallHooks } from './commands/install-hooks.js';

const program = new Command();

program
  .name('agent-policy')
  .description(
    'Keep AI coding-agent instruction files in sync and enforce commit attribution.',
  )
  .version('0.1.0')
  .option('-c, --config <path>', 'path to agent-policy.yaml')
  .option('-C, --cwd <path>', 'working directory', process.cwd())
  .option('--json', 'machine-readable output', false)
  .option('--quiet', 'suppress non-error output', false);

export function contextFromOpts(opts: Record<string, unknown>): CommandContext {
  const ctx: CommandContext = {
    cwd: resolve(String(opts['cwd'] ?? process.cwd())),
    json: Boolean(opts['json']),
    quiet: Boolean(opts['quiet']),
  };
  if (typeof opts['config'] === 'string') {
    ctx.configPath = opts['config'];
  }
  return ctx;
}

program
  .command('init')
  .description('Scaffold agent-policy.yaml in the current directory')
  .option('--force', 'overwrite an existing file')
  .action((cmdOpts: { force?: boolean }) => {
    const ctx = contextFromOpts(program.opts());
    const result = runInit({ ...ctx, force: Boolean(cmdOpts.force) });
    process.exit(result.exitCode);
  });

program
  .command('validate')
  .description('Parse and schema-validate agent-policy.yaml')
  .action(() => {
    const ctx = contextFromOpts(program.opts());
    const result = runValidate(ctx);
    process.exit(result.exitCode);
  });

program
  .command('render')
  .description('Render enabled renderers to stdout')
  .option('--renderer <id>', 'render only this renderer (agents_md|claude_md|copilot_instructions)')
  .action((cmdOpts: { renderer?: string }) => {
    const ctx = contextFromOpts(program.opts());
    const opts: Parameters<typeof runRender>[0] = { ...ctx };
    if (cmdOpts.renderer) opts.renderer = cmdOpts.renderer;
    const result = runRender(opts);
    process.exit(result.exitCode);
  });

program
  .command('sync')
  .description('Render enabled renderers and write to disk')
  .option('--check', 'do not write; exit 1 if any file differs from rendered output')
  .option('--force', 'overwrite files that do not carry the agent-policy banner')
  .action((cmdOpts: { check?: boolean; force?: boolean }) => {
    const ctx = contextFromOpts(program.opts());
    if (cmdOpts.check) {
      const result = runSyncCheck(ctx);
      process.exit(result.exitCode);
    }
    const result = runSync({ ...ctx, force: Boolean(cmdOpts.force) });
    process.exit(result.exitCode);
  });

program
  .command('check-commit <messageFile>')
  .description('Validate a commit message file (use "-" for stdin)')
  .action((messageFile: string) => {
    const ctx = contextFromOpts(program.opts());
    const result = runCheckCommit({ ...ctx, messageFile });
    process.exit(result.exitCode);
  });

program
  .command('install-hooks')
  .description('Install the commit-msg hook that runs agent-policy check-commit')
  .option('--force', 'overwrite an existing .bak file when replacing a foreign hook')
  .action((cmdOpts: { force?: boolean }) => {
    const ctx = contextFromOpts(program.opts());
    const result = runInstallHooks({ ...ctx, force: Boolean(cmdOpts.force) });
    process.exit(result.exitCode);
  });

export async function run(argv: string[]): Promise<void> {
  await program.parseAsync(argv);
}

export { program };

// Entry point: always run when this module is the process entrypoint.
// For the bundled CLI (dist/cli.js) this is always true.
run(process.argv).catch((err: Error) => {
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
});
