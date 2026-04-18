export type RendererId = 'agents_md' | 'claude_md' | 'copilot_instructions';

export interface PolicySection {
  id: string;
  title: string;
  body: string;
  pinned?: boolean;
  renderers?: RendererId[];
}

export interface RendererConfig {
  enabled?: boolean;
  path?: string;
  concise?: boolean;
}

export interface AssistedByConfig {
  required?: boolean;
  format?: string;
  human_marker?: string;
  allow_multiple?: boolean;
}

export interface AgentPolicyConfig {
  version: 1;
  project?: { name?: string; description?: string };
  policy?: { sections: PolicySection[] };
  attribution?: { assisted_by?: AssistedByConfig };
  renderers?: Partial<Record<RendererId, RendererConfig>>;
  task_policy?: {
    commit_on_task_completion?: boolean;
    allow_checkpoint_commits?: boolean;
    require_user_prompt_for_squash?: boolean;
  };
  checkpoint_commit?: {
    enabled?: boolean;
    subject_format?: string;
    run_precommit?: boolean;
  };
  final_commit?: {
    conventional_commits?: boolean;
    run_precommit?: boolean;
    required_footers?: string[];
  };
}

export const DEFAULT_RENDERER_PATHS: Record<RendererId, string> = {
  agents_md: 'AGENTS.md',
  claude_md: 'CLAUDE.md',
  copilot_instructions: '.github/copilot-instructions.md',
};
