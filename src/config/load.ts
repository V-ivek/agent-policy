import { parse, YAMLParseError } from 'yaml';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { AgentPolicyConfig } from './types.js';

export function loadConfigFromString(source: string): AgentPolicyConfig {
  try {
    const parsed = parse(source);
    if (parsed === null || typeof parsed !== 'object') {
      throw new Error('Config must be a YAML object');
    }
    return parsed as AgentPolicyConfig;
  } catch (err) {
    if (err instanceof YAMLParseError) {
      throw new Error(`YAML parse error: ${err.message}`);
    }
    throw err;
  }
}

export function loadConfigFromFile(path: string): AgentPolicyConfig {
  const source = readFileSync(path, 'utf8');
  return loadConfigFromString(source);
}

export function findConfigFile(startDir: string): string | null {
  // Walk upward; stop when dirname returns the same path (filesystem root).
  let dir = startDir;
  let parent = dirname(dir);
  while (parent !== dir) {
    const candidate = join(dir, 'agent-policy.yaml');
    if (existsSync(candidate)) return candidate;
    dir = parent;
    parent = dirname(dir);
  }
  const candidate = join(dir, 'agent-policy.yaml');
  return existsSync(candidate) ? candidate : null;
}
