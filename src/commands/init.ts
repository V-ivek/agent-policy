import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { CommandResult } from './types.js';

const TEMPLATE = `version: 1

project:
  name: my-repo
  description: ""

policy:
  sections:
    - id: overview
      title: Project overview
      body: |
        Describe what this repo does, its high-level architecture, and the top
        things an AI assistant needs to know to be useful here.
    - id: conventions
      title: Conventions
      body: |
        - Prefer small, focused modules.
        - Tests live alongside the code they test.

attribution:
  assisted_by:
    required: true
    format: "Assisted-by: {agent}:{model}"
    human_marker: "Assisted-by: n/a"
    allow_multiple: true

renderers:
  agents_md:
    enabled: true
    path: AGENTS.md
  claude_md:
    enabled: true
    path: CLAUDE.md
    concise: true
  copilot_instructions:
    enabled: true
    path: .github/copilot-instructions.md
    concise: true
`;

export interface InitOptions {
  cwd: string;
  json: boolean;
  quiet: boolean;
  force?: boolean;
}

export function runInit(opts: InitOptions): CommandResult {
  const target = join(opts.cwd, 'agent-policy.yaml');
  if (existsSync(target) && !opts.force) {
    if (!opts.quiet) {
      process.stderr.write(
        `agent-policy.yaml already exists at ${target}. Use --force to overwrite.\n`,
      );
    }
    return { exitCode: 2 };
  }
  writeFileSync(target, TEMPLATE, 'utf8');
  if (!opts.quiet) {
    process.stdout.write(`Wrote ${target}\n`);
  }
  return { exitCode: 0 };
}
