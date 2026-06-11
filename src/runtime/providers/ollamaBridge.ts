// Real Ollama bridge — health checks and chat completions via localhost:11434.

import type { ProviderBridge, ProviderHealth } from './providerBridge'
import type { CompletionRequest, CompletionResult, StreamCallback } from '../inference/types'
import { InferenceError } from '../inference/types'

const OLLAMA_BASE = 'http://localhost:11434'
const INFERENCE_TIMEOUT_MS = 120_000

interface OllamaTagsResponse {
  models: { name: string; size: number; modified_at: string }[]
}

interface OllamaChatResponse {
  message?: { content?: string }
  prompt_eval_count?: number
  eval_count?: number
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

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const health = await this.ping()
    if (health.state === 'unreachable') {
      throw new InferenceError('unconfigured', 'Ollama is not running. Start Ollama locally (ollama serve).')
    }

    const messages = request.messages.map(m => ({
      role: m.role === 'system' ? 'system' : m.role,
      content: m.content,
    }))

    const body: Record<string, unknown> = {
      model: request.model,
      messages,
      stream: false,
      options: {
        temperature: request.temperature ?? 0.2,
      },
    }
    if (request.jsonMode) {
      body.format = 'json'
    }

    try {
      const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(INFERENCE_TIMEOUT_MS),
      })

      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        throw new InferenceError(
          'inference_failed',
          `Ollama request failed (HTTP ${res.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`,
        )
      }

      const data: OllamaChatResponse = await res.json()
      const content = data.message?.content?.trim() ?? ''
      if (!content) {
        throw new InferenceError('inference_failed', 'Ollama returned an empty response')
      }

      const promptTokens = data.prompt_eval_count ?? 0
      const completionTokens = data.eval_count ?? 0

      return {
        content,
        model: request.model,
        providerId: this.providerId,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
      }
    } catch (err) {
      if (err instanceof InferenceError) throw err
      throw new InferenceError(
        'inference_failed',
        err instanceof Error ? err.message : 'Ollama inference failed',
      )
    }
  }

  async stream(request: CompletionRequest, onChunk: StreamCallback): Promise<CompletionResult> {
    const health = await this.ping()
    if (health.state === 'unreachable') {
      throw new InferenceError('unconfigured', 'Ollama is not running. Start Ollama locally (ollama serve).')
    }

    const messages = request.messages.map(m => ({
      role: m.role === 'system' ? 'system' : m.role,
      content: m.content,
    }))

    const body: Record<string, unknown> = {
      model: request.model,
      messages,
      stream: true,
      options: { temperature: request.temperature ?? 0.2 },
    }
    if (request.jsonMode) {
      body.format = 'json'
    }

    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(INFERENCE_TIMEOUT_MS),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new InferenceError(
        'inference_failed',
        `Ollama stream failed (HTTP ${res.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`,
      )
    }

    const reader = res.body?.getReader()
    if (!reader) {
      throw new InferenceError('inference_failed', 'Ollama stream returned no body')
    }

    const decoder = new TextDecoder()
    let content = ''
    let promptTokens = 0
    let completionTokens = 0
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.trim()) continue
        let data: OllamaChatResponse
        try {
          data = JSON.parse(line) as OllamaChatResponse
        } catch {
          continue
        }

        const delta = data.message?.content ?? ''
        if (delta) {
          content += delta
          onChunk({ delta })
        }

        if (data.prompt_eval_count !== undefined) promptTokens = data.prompt_eval_count
        if (data.eval_count !== undefined) completionTokens = data.eval_count

        if ((data as { done?: boolean }).done) {
          const usage = {
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
          }
          onChunk({ delta: '', done: true, usage })
        }
      }
    }

    if (!content.trim()) {
      throw new InferenceError('inference_failed', 'Ollama stream returned empty content')
    }

    return {
      content: content.trim(),
      model: request.model,
      providerId: this.providerId,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
    }
  }
}

export const ollamaBridge = new OllamaBridge()
