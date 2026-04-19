import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { BANNER_FIRST_LINE } from '../renderers/common.js';

export function hasBanner(path: string): boolean {
  if (!existsSync(path)) return true; // writing a new file is fine
  try {
    const content = readFileSync(path, 'utf8');
    return content.startsWith(BANNER_FIRST_LINE);
  } catch {
    return false;
  }
}

export function writeFileEnsuringDir(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}
