import { wrapWithBanner } from './common.js';
import type { Renderer } from './compose.js';
import { composeAttributionSection, filterSections } from './compose.js';
import type { AgentPolicyConfig } from '../config/types.js';

function renderBody(config: AgentPolicyConfig): string {
  const parts: string[] = [];
  const name = config.project?.name ?? 'Project';
  parts.push(`# ${name}`);
  if (config.project?.description) parts.push('', config.project.description);
  parts.push('');

  const concise = config.renderers?.copilot_instructions?.concise ?? false;
  const sections = filterSections(
    config.policy?.sections ?? [],
    'copilot_instructions',
    concise,
  );
  for (const s of sections) {
    parts.push(`## ${s.title}`, '', s.body.trim(), '');
  }

  const attribution = composeAttributionSection(config);
  if (attribution) parts.push(attribution, '');
  return parts.join('\n');
}

export const copilotRenderer: Renderer = {
  id: 'copilot_instructions',
  defaultPath: '.github/copilot-instructions.md',
  render(config) {
    return wrapWithBanner(renderBody(config));
  },
};
