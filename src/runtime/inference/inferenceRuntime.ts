import { providerRegistry } from '../providers/providerRegistry'
import type { AgentRole } from './modelRouting'
import { resolveModelForRole } from './modelRouting'
import type { CompletionRequest, CompletionResult } from './types'
import { InferenceError } from './types'

export interface InferenceOptions {
  providerId?: string
  modelId?: string
}

export async function completeForRole(
  role: AgentRole,
  request: Omit<CompletionRequest, 'model'>,
  options: InferenceOptions = {},
): Promise<CompletionResult> {
  const resolved = resolveModelForRole(role, {
    providerId: options.providerId,
    modelId: options.modelId,
  })

  const bridge = providerRegistry.get(resolved.providerId)
  if (!bridge) {
    throw new InferenceError('unconfigured', `Unknown provider: ${resolved.providerId}`)
  }

  const health = await bridge.ping()
  if (health.state === 'unconfigured' || health.state === 'unauthorized') {
    throw new InferenceError(
      'unconfigured',
      health.errorMessage ?? `${bridge.name} is not configured`,
    )
  }
  if (health.state === 'unreachable') {
    throw new InferenceError(
      'unconfigured',
      health.errorMessage ?? `${bridge.name} is unreachable`,
    )
  }

  try {
    return await bridge.complete({
      ...request,
      model: resolved.modelId,
    })
  } catch (err) {
    if (err instanceof InferenceError) throw err
    throw new InferenceError(
      'inference_failed',
      err instanceof Error ? err.message : 'Inference request failed',
    )
  }
}
