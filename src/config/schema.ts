import Ajv2020 from 'ajv/dist/2020.js';
import type { AnySchema, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { AgentPolicyConfig } from './types.js';

export interface ValidationError {
  path: string;
  message: string;
}

export type ValidationResult =
  | { ok: true; config: AgentPolicyConfig }
  | { ok: false; errors: ValidationError[] };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadSchema(): AnySchema {
  const candidates = [
    join(__dirname, '../../schemas/agent-policy.schema.json'),
    join(__dirname, '../schemas/agent-policy.schema.json'),
    join(__dirname, '../../../schemas/agent-policy.schema.json'),
  ];
  for (const p of candidates) {
    try {
      return JSON.parse(readFileSync(p, 'utf8')) as AnySchema;
    } catch {
      /* try next */
    }
  }
  throw new Error('agent-policy schema not found');
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(loadSchema());

function formatError(e: ErrorObject): ValidationError {
  const path = e.instancePath;
  let message: string;
  if (e.keyword === 'required') {
    const prop = (e.params as { missingProperty?: string }).missingProperty ?? 'field';
    message = `missing required property "${prop}"`;
  } else if (e.keyword === 'additionalProperties') {
    const extra = (e.params as { additionalProperty?: string }).additionalProperty ?? 'unknown';
    message = `unknown property "${extra}"`;
  } else {
    message = e.message ?? 'invalid';
  }
  return { path, message };
}

function checkUniqueSectionIds(config: AgentPolicyConfig): ValidationError[] {
  const sections = config.policy?.sections ?? [];
  const seen = new Set<string>();
  const errors: ValidationError[] = [];
  sections.forEach((s, i) => {
    if (seen.has(s.id)) {
      errors.push({
        path: `/policy/sections/${i}/id`,
        message: `duplicate section id "${s.id}"`,
      });
    }
    seen.add(s.id);
  });
  return errors;
}

export function validateConfig(input: unknown): ValidationResult {
  if (!validate(input)) {
    const errors = (validate.errors ?? []).map(formatError);
    return { ok: false, errors };
  }
  const config = input as AgentPolicyConfig;
  const semanticErrors = checkUniqueSectionIds(config);
  if (semanticErrors.length > 0) {
    return { ok: false, errors: semanticErrors };
  }
  return { ok: true, config };
}
