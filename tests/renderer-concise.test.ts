import { describe, it, expect } from 'vitest';
import { claudeMdRenderer } from '../src/renderers/claude-md.js';
import { copilotRenderer } from '../src/renderers/copilot.js';
import { stripBanner } from '../src/renderers/common.js';
import type { AgentPolicyConfig } from '../src/config/types.js';

const cfg: AgentPolicyConfig = {
  version: 1,
  project: { name: 'r' },
  policy: {
    sections: [
      { id: 'overview', title: 'Overview', body: 'pinned body', pinned: true },
      { id: 'claude-only', title: 'Claude-only', body: 'for claude', renderers: ['claude_md'] },
      { id: 'copilot-only', title: 'Copilot-only', body: 'for copilot', renderers: ['copilot_instructions'] },
      { id: 'agents-only', title: 'Agents-only', body: 'for agents', renderers: ['agents_md'] },
    ],
  },
  renderers: {
    claude_md: { enabled: true, concise: true },
    copilot_instructions: { enabled: true, concise: true },
  },
};

describe('claudeMdRenderer concise', () => {
  it('includes pinned and claude-targeted sections, excludes others', () => {
    const { body } = stripBanner(claudeMdRenderer.render(cfg));
    expect(body).toContain('Overview');
    expect(body).toContain('Claude-only');
    expect(body).not.toContain('Copilot-only');
    expect(body).not.toContain('Agents-only');
  });

  it('includes a preamble pointing to AGENTS.md', () => {
    const { body } = stripBanner(claudeMdRenderer.render(cfg));
    expect(body).toMatch(/AGENTS\.md/);
  });

  it('when concise=false, includes all sections', () => {
    const nonConcise: AgentPolicyConfig = {
      ...cfg,
      renderers: { claude_md: { enabled: true, concise: false } },
    };
    const { body } = stripBanner(claudeMdRenderer.render(nonConcise));
    expect(body).toContain('Claude-only');
    expect(body).toContain('Copilot-only');
    expect(body).toContain('Agents-only');
  });
});

describe('copilotRenderer concise', () => {
  it('includes pinned and copilot-targeted sections only', () => {
    const { body } = stripBanner(copilotRenderer.render(cfg));
    expect(body).toContain('Overview');
    expect(body).toContain('Copilot-only');
    expect(body).not.toContain('Claude-only');
  });

  it('has no preamble (Copilot prefers plain instructions)', () => {
    const { body } = stripBanner(copilotRenderer.render(cfg));
    expect(body).not.toMatch(/AGENTS\.md/);
  });
});
