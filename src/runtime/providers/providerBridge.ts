import type { ProviderHealth } from '../../types'

// ── ProviderBridge interface ──────────────────────────────────────────────────
// Each bridge implements this. Swap implementations per provider type.
// In production these become real SDK calls or local socket connections.

export interface ProviderBridge {
  readonly providerId: string
  readonly name: string
  ping(): Promise<ProviderHealth>
  getModels(): Promise<string[]>
}

export type { ProviderHealth }
