// ProviderRegistry owns all bridge instances.
// Add or remove providers here; the rest of the runtime observes via events.

import { ollamaBridge } from './ollamaBridge'
import { OpenAICompatibleBridge } from './openaiCompatibleBridge'
import type { ProviderBridge } from './providerBridge'
import type { ProviderHealth } from '../../types'

const anthropicBridge = new OpenAICompatibleBridge({
  providerId: 'anthropic',
  name: 'Anthropic',
  endpoint: 'https://api.anthropic.com',
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
})

const openAIBridge = new OpenAICompatibleBridge({
  providerId: 'openai',
  name: 'OpenAI',
  endpoint: 'https://api.openai.com',
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
})

class ProviderRegistry {
  private bridges = new Map<string, ProviderBridge>([
    ['ollama',    ollamaBridge],
    ['anthropic', anthropicBridge],
    ['openai',    openAIBridge],
  ])

  getAll(): ProviderBridge[] {
    return Array.from(this.bridges.values())
  }

  get(id: string): ProviderBridge | undefined {
    return this.bridges.get(id)
  }

  async pingAll(): Promise<ProviderHealth[]> {
    return Promise.all(this.getAll().map(b => b.ping()))
  }

  async ping(id: string): Promise<ProviderHealth | null> {
    const bridge = this.get(id)
    return bridge ? bridge.ping() : null
  }
}

export const providerRegistry = new ProviderRegistry()
