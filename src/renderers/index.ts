import { agentsMdRenderer } from './agents-md.js';
import { claudeMdRenderer } from './claude-md.js';
import { copilotRenderer } from './copilot.js';
import type { Renderer } from './compose.js';
import type { AgentPolicyConfig, RendererId } from '../config/types.js';

export type { Renderer };

export const RENDERERS: Record<RendererId, Renderer> = {
  agents_md: agentsMdRenderer,
  claude_md: claudeMdRenderer,
  copilot_instructions: copilotRenderer,
};

export function getEnabledRenderers(
  config: AgentPolicyConfig,
): Array<{ renderer: Renderer; path: string }> {
  const result: Array<{ renderer: Renderer; path: string }> = [];
  for (const id of Object.keys(RENDERERS) as RendererId[]) {
    const rc = config.renderers?.[id];
    const enabled = rc?.enabled !== false;
    if (!enabled) continue;
    const path = rc?.path ?? RENDERERS[id].defaultPath;
    result.push({ renderer: RENDERERS[id], path });
  }
  return result;
}
