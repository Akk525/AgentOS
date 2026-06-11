import type { AgentRole } from '../inference/modelRouting'
import type { TokenUsage } from '../inference/types'
import { getLocalStore } from '../store'
import { accumulateSessionUsage } from '../sessionStore'
import { taskGraphEngine } from '../taskGraphEngine'
import { estimateCostUsd } from './modelPricing'

export interface RecordTokenUsageInput {
  projectId: string
  nodeId: string
  sessionId?: string
  providerId: string
  modelId: string
  role: AgentRole | 'planner'
  usage: TokenUsage
  message?: string
}

export interface RecordTokenUsageResult {
  addedTokens: number
  addedCostUsd: number
  totalTokens: number
  totalCostUsd: number
}

export async function recordTokenUsage(
  input: RecordTokenUsageInput,
): Promise<RecordTokenUsageResult> {
  const { projectId, nodeId, sessionId, providerId, modelId, role, usage } = input
  const addedTokens = usage.totalTokens
  const addedCostUsd = estimateCostUsd(providerId, modelId, usage)

  const node = taskGraphEngine.getState().nodes.find(n => n.id === nodeId)
  const meta = (node?.metadata ?? {}) as Record<string, unknown>
  const priorTokens = (meta.tokensUsed as number) ?? 0
  const priorCost = (meta.costUsd as number) ?? 0
  const totalTokens = priorTokens + addedTokens
  const totalCostUsd = priorCost + addedCostUsd

  await taskGraphEngine.updateNodeMetadata(nodeId, {
    tokensUsed: totalTokens,
    costUsd: totalCostUsd,
    lastProviderId: providerId,
    lastModelId: modelId,
  })

  if (sessionId) {
    await accumulateSessionUsage(projectId, nodeId, {
      addedTokens,
      addedCostUsd,
      tokensUsed: totalTokens,
      costUsd: totalCostUsd,
    })
  }

  await getLocalStore().appendEvent({
    projectId,
    nodeId,
    sessionId,
    type: 'usage_recorded',
    message: input.message ?? `${role} used ${addedTokens.toLocaleString()} tokens ($${addedCostUsd.toFixed(4)})`,
    severity: 'info',
    payload: {
      agentName: role,
      providerId,
      modelId,
      role,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      costUsd: addedCostUsd,
      cumulativeTokens: totalTokens,
      cumulativeCostUsd: totalCostUsd,
    },
  })

  return { addedTokens, addedCostUsd, totalTokens, totalCostUsd }
}
