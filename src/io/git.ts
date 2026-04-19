import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

export function resolveHooksDir(cwd: string): string {
  const out = execFileSync('git', ['rev-parse', '--git-path', 'hooks'], {
    cwd,
    encoding: 'utf8',
  }).trim();
  return resolve(cwd, out);
}
