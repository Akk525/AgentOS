// Real Ollama bridge — makes an actual HTTP call to localhost:11434.
// Read-only; only fetches available models. Safe to call unconditionally.

import type { ProviderBridge, ProviderHealth } from './providerBridge'

const OLLAMA_BASE = 'http://localhost:11434'

interface OllamaTagsResponse {
  models: { name: string; size: number; modified_at: string }[]
}

export class OllamaBridge implements ProviderBridge {
  readonly providerId = 'ollama'
  readonly name = 'Ollama'

  async ping(): Promise<ProviderHealth> {
    const start = Date.now()
    const base: Omit<ProviderHealth, 'state' | 'latencyMs' | 'discoveredModels' | 'errorMessage'> = {
      providerId: 'ollama',
      name: 'Ollama',
      endpoint: OLLAMA_BASE,
      lastPingedAt: new Date().toISOString(),
      apiKeyPresent: false,
    }

    try {
      const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      })
      const latencyMs = Date.now() - start

      if (!res.ok) {
        return { ...base, state: 'degraded', latencyMs, discoveredModels: [], errorMessage: `HTTP ${res.status}` }
      }

      const data: OllamaTagsResponse = await res.json()
      const models = data.models?.map(m => m.name) ?? []

      return {
        ...base,
        state: latencyMs > 800 ? 'latency_high' : 'connected',
        latencyMs,
        discoveredModels: models,
      }
    } catch (err) {
      const latencyMs = Date.now() - start
      const isTimeout = err instanceof Error && err.name === 'TimeoutError'
      return {
        ...base,
        state: 'unreachable',
        latencyMs: isTimeout ? latencyMs : null,
        discoveredModels: [],
        errorMessage: isTimeout ? 'Connection timed out' : 'Server not reachable',
      }
    }
  }

  async getModels(): Promise<string[]> {
    try {
      const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(3000) })
      if (!res.ok) return []
      const data: OllamaTagsResponse = await res.json()
      return data.models?.map(m => m.name) ?? []
    } catch {
      return []
    }
  }
}

export const ollamaBridge = new OllamaBridge()
