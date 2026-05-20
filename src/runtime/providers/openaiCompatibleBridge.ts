// OpenAI-compatible bridge — tests endpoint reachability and API key presence.
// Does NOT send actual inference requests. Only probes /models or health endpoint.

import type { ProviderBridge, ProviderHealth } from './providerBridge'

interface OpenAICompatibleConfig {
  providerId: string
  name: string
  endpoint: string
  apiKey?: string
}

export class OpenAICompatibleBridge implements ProviderBridge {
  readonly providerId: string
  readonly name: string
  private readonly endpoint: string
  private readonly apiKey: string | undefined

  constructor(config: OpenAICompatibleConfig) {
    this.providerId = config.providerId
    this.name = config.name
    this.endpoint = config.endpoint.replace(/\/$/, '')
    this.apiKey = config.apiKey
  }

  async ping(): Promise<ProviderHealth> {
    const start = Date.now()
    const base: Omit<ProviderHealth, 'state' | 'latencyMs' | 'discoveredModels' | 'errorMessage'> = {
      providerId: this.providerId,
      name: this.name,
      endpoint: this.endpoint,
      lastPingedAt: new Date().toISOString(),
      apiKeyPresent: !!this.apiKey,
    }

    if (!this.apiKey) {
      return { ...base, state: 'unconfigured', latencyMs: null, discoveredModels: [], errorMessage: 'No API key configured' }
    }

    try {
      const res = await fetch(`${this.endpoint}/v1/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(5000),
      })
      const latencyMs = Date.now() - start

      if (res.status === 401 || res.status === 403) {
        return { ...base, state: 'unauthorized', latencyMs, discoveredModels: [], errorMessage: 'Invalid API key' }
      }
      if (!res.ok) {
        return { ...base, state: 'degraded', latencyMs, discoveredModels: [], errorMessage: `HTTP ${res.status}` }
      }

      const data = await res.json()
      const models: string[] = (data?.data ?? []).map((m: { id: string }) => m.id).slice(0, 10)

      return {
        ...base,
        state: latencyMs > 1200 ? 'latency_high' : 'connected',
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
        errorMessage: isTimeout ? 'Request timed out' : 'Endpoint unreachable',
      }
    }
  }

  async getModels(): Promise<string[]> {
    if (!this.apiKey) return []
    try {
      const res = await fetch(`${this.endpoint}/v1/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return []
      const data = await res.json()
      return (data?.data ?? []).map((m: { id: string }) => m.id)
    } catch {
      return []
    }
  }
}
