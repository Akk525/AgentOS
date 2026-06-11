import type { TokenUsage } from '../inference/types'

export interface ModelPricing {
  promptPer1M: number
  completionPer1M: number
}

/** USD per 1M tokens — static estimates for Year 1 metering. */
const PRICING: Record<string, ModelPricing> = {
  'anthropic:claude-sonnet-4-6': { promptPer1M: 3, completionPer1M: 15 },
  'anthropic:claude-opus-4-6': { promptPer1M: 15, completionPer1M: 75 },
  'openai:gpt-4o': { promptPer1M: 2.5, completionPer1M: 10 },
  'openai:gpt-4o-mini': { promptPer1M: 0.15, completionPer1M: 0.6 },
  'ollama:llama3.2': { promptPer1M: 0, completionPer1M: 0 },
}

const PROVIDER_DEFAULTS: Record<string, ModelPricing> = {
  anthropic: { promptPer1M: 3, completionPer1M: 15 },
  openai: { promptPer1M: 2.5, completionPer1M: 10 },
  ollama: { promptPer1M: 0, completionPer1M: 0 },
  mock: { promptPer1M: 0, completionPer1M: 0 },
}

function pricingKey(providerId: string, modelId: string): string {
  return `${providerId}:${modelId}`
}

export function getModelPricing(providerId: string, modelId: string): ModelPricing {
  return (
    PRICING[pricingKey(providerId, modelId)] ??
    PROVIDER_DEFAULTS[providerId] ??
    { promptPer1M: 0, completionPer1M: 0 }
  )
}

export function estimateCostUsd(
  providerId: string,
  modelId: string,
  usage: TokenUsage,
): number {
  const rates = getModelPricing(providerId, modelId)
  const promptCost = (usage.promptTokens / 1_000_000) * rates.promptPer1M
  const completionCost = (usage.completionTokens / 1_000_000) * rates.completionPer1M
  return Math.round((promptCost + completionCost) * 1_000_000) / 1_000_000
}

export function sumTokenUsage(usages: (TokenUsage | undefined)[]): TokenUsage {
  let promptTokens = 0
  let completionTokens = 0
  for (const u of usages) {
    if (!u) continue
    promptTokens += u.promptTokens
    completionTokens += u.completionTokens
  }
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  }
}
