import type { AgentPolicyConfig, PolicySection, RendererId } from '../config/types.js';

export interface Renderer {
  id: RendererId;
  defaultPath: string;
  render(config: AgentPolicyConfig): string;
}

export function filterSections(
  sections: PolicySection[],
  forRenderer: RendererId,
  concise: boolean,
): PolicySection[] {
  if (!concise) return sections;
  return sections.filter(
    (s) => s.pinned === true || (s.renderers ?? []).includes(forRenderer),
  );
}

export function composeAttributionSection(config: AgentPolicyConfig): string {
  const a = config.attribution?.assisted_by;
  if (!a || a.required === false) return '';
  const format = a.format ?? 'Assisted-by: {agent}:{model}';
  const human = a.human_marker ?? 'Assisted-by: n/a';
  const allowMultiple = a.allow_multiple !== false;

  const lines = [
    '## Attribution',
    '',
    'All commits must end with an `Assisted-by:` footer.',
    '',
    `- AI-assisted: \`${format}\``,
    `- Human-only: \`${human}\``,
  ];
  if (allowMultiple) {
    lines.push('- Multiple footers are allowed for multi-vendor work.');
  }
  return lines.join('\n');
}
