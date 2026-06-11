export type AgentRole = 'planner' | 'builder' | 'reviewer' | 'test-writer' | 'general'

export interface RoleModelDefaults {
  providerId: string
  modelId: string
}

const ROLE_DEFAULTS: Record<AgentRole, RoleModelDefaults> = {
  planner: { providerId: 'ollama', modelId: 'llama3.2' },
  builder: { providerId: 'anthropic', modelId: 'claude-sonnet-4-6' },
  reviewer: { providerId: 'openai', modelId: 'gpt-4o' },
  'test-writer': { providerId: 'anthropic', modelId: 'claude-sonnet-4-6' },
  general: { providerId: 'ollama', modelId: 'llama3.2' },
}

export const PROVIDER_DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4o',
  ollama: 'llama3.2',
}

export function getDefaultForRole(role: AgentRole): RoleModelDefaults {
  return ROLE_DEFAULTS[role]
}

export function resolveModelForRole(
  role: AgentRole,
  override?: Partial<RoleModelDefaults>,
): RoleModelDefaults {
  const defaults = getDefaultForRole(role)
  return {
    providerId: override?.providerId ?? defaults.providerId,
    modelId: override?.modelId ?? defaults.modelId,
  }
}
