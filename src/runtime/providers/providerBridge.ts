import type { ProviderHealth } from '../../types'
import type { CompletionRequest, CompletionResult } from '../inference/types'

// ── ProviderBridge interface ──────────────────────────────────────────────────
// Each bridge implements this. Swap implementations per provider type.
// In production these become real SDK calls or local socket connections.

export interface ProviderBridge {
  readonly providerId: string
  readonly name: string
  ping(): Promise<ProviderHealth>
  getModels(): Promise<string[]>
  complete(request: CompletionRequest): Promise<CompletionResult>
}

export type { ProviderHealth }
