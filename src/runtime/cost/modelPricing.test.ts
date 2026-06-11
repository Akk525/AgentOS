/**
 * Run via: npx tsx src/runtime/cost/modelPricing.test.ts
 */
import { estimateCostUsd, getModelPricing, sumTokenUsage } from './modelPricing'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function run(): void {
  const anthropic = getModelPricing('anthropic', 'claude-sonnet-4-6')
  assert(anthropic.promptPer1M === 3, 'anthropic prompt rate')
  assert(anthropic.completionPer1M === 15, 'anthropic completion rate')

  const ollama = getModelPricing('ollama', 'llama3.2')
  assert(ollama.promptPer1M === 0, 'ollama is free')

  const cost = estimateCostUsd('anthropic', 'claude-sonnet-4-6', {
    promptTokens: 1_000_000,
    completionTokens: 0,
    totalTokens: 1_000_000,
  })
  assert(cost === 3, `expected $3 for 1M prompt tokens, got ${cost}`)

  const combined = sumTokenUsage([
    { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
  ])
  assert(combined.totalTokens === 450, 'sumTokenUsage totals')
  assert(combined.promptTokens === 300, 'sumTokenUsage prompt')
  assert(combined.completionTokens === 150, 'sumTokenUsage completion')

  console.log('modelPricing.test.ts: all passed')
}

run()
