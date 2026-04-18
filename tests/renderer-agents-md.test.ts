import { describe, it, expect } from 'vitest';
import { agentsMdRenderer } from '../src/renderers/agents-md.js';
import { stripBanner } from '../src/renderers/common.js';

describe('agentsMdRenderer', () => {
  it('emits a full document with all sections', () => {
    const out = agentsMdRenderer.render({
      version: 1,
      project: { name: 'repo', description: 'desc' },
      policy: {
        sections: [
          { id: 'a', title: 'Alpha', body: 'first' },
          { id: 'b', title: 'Beta', body: 'second' },
        ],
      },
      attribution: { assisted_by: { required: true } },
    });

    const { body, hash } = stripBanner(out);
    expect(hash).toBeTruthy();
    expect(body).toMatch(/^# repo/);
    expect(body).toContain('desc');
    expect(body).toContain('## Alpha');
    expect(body).toContain('## Beta');
    expect(body).toContain('## Attribution');
    expect(body.indexOf('Alpha') < body.indexOf('Beta')).toBe(true);
  });

  it('produces byte-identical output on repeat render', () => {
    const cfg = {
      version: 1 as const,
      project: { name: 'r' },
      policy: { sections: [{ id: 'x', title: 'X', body: 'y' }] },
    };
    expect(agentsMdRenderer.render(cfg)).toBe(agentsMdRenderer.render(cfg));
  });

  it('omits the attribution section when required is false', () => {
    const out = agentsMdRenderer.render({
      version: 1,
      project: { name: 'r' },
      policy: { sections: [{ id: 'x', title: 'X', body: 'y' }] },
      attribution: { assisted_by: { required: false } },
    });
    const { body } = stripBanner(out);
    expect(body).not.toContain('## Attribution');
  });
});
