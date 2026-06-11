// OpenAI-compatible bridge — health checks and chat completions.
// Anthropic uses the Messages API when providerId is 'anthropic'.

import type { ProviderBridge, ProviderHealth } from './providerBridge'
import type { CompletionMessage, CompletionRequest, CompletionResult, StreamCallback } from '../inference/types'
import { InferenceError } from '../inference/types'

const INFERENCE_TIMEOUT_MS = 120_000

interface OpenAICompatibleConfig {
  providerId: string
  name: string
  endpoint: string
  apiKey?: string
}

interface OpenAIChatResponse {
  choices?: { message?: { content?: string } }[]
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
}

interface AnthropicMessageResponse {
  content?: { type: string; text?: string }[]
  usage?: { input_tokens?: number; output_tokens?: number }
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
      const url = this.providerId === 'anthropic'
        ? `${this.endpoint}/v1/models`
        : `${this.endpoint}/v1/models`
      const headers = this.authHeaders()
      const res = await fetch(url, {
        headers,
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
      const models: string[] = this.providerId === 'anthropic'
        ? (data?.data ?? []).map((m: { id: string }) => m.id).slice(0, 10)
        : (data?.data ?? []).map((m: { id: string }) => m.id).slice(0, 10)

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
        headers: this.authHeaders(),
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) return []
      const data = await res.json()
      return (data?.data ?? []).map((m: { id: string }) => m.id)
    } catch {
      return []
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    if (!this.apiKey) {
      throw new InferenceError(
        'unconfigured',
        `No API key configured. Set VITE_${this.providerId.toUpperCase()}_API_KEY in your environment.`,
      )
    }

    if (this.providerId === 'anthropic') {
      return this.completeAnthropic(request)
    }
    return this.completeOpenAI(request)
  }

  async stream(request: CompletionRequest, onChunk: StreamCallback): Promise<CompletionResult> {
    if (!this.apiKey) {
      throw new InferenceError(
        'unconfigured',
        `No API key configured. Set VITE_${this.providerId.toUpperCase()}_API_KEY in your environment.`,
      )
    }

    if (this.providerId === 'anthropic') {
      return this.streamAnthropic(request, onChunk)
    }
    return this.streamOpenAI(request, onChunk)
  }

  private authHeaders(): Record<string, string> {
    if (this.providerId === 'anthropic') {
      return {
        'x-api-key': this.apiKey!,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      }
    }
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    }
  }

  private splitMessages(messages: CompletionMessage[]): { system?: string; conversation: CompletionMessage[] } {
    const systemParts = messages.filter(m => m.role === 'system').map(m => m.content)
    const conversation = messages.filter(m => m.role !== 'system')
    return {
      system: systemParts.length > 0 ? systemParts.join('\n\n') : undefined,
      conversation,
    }
  }

  private async streamOpenAI(request: CompletionRequest, onChunk: StreamCallback): Promise<CompletionResult> {
    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 4096,
      stream: true,
      stream_options: { include_usage: true },
    }
    if (request.jsonMode) {
      body.response_format = { type: 'json_object' }
    }

    const res = await fetch(`${this.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(INFERENCE_TIMEOUT_MS),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new InferenceError(
        'inference_failed',
        `${this.name} stream failed (HTTP ${res.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`,
      )
    }

    const reader = res.body?.getReader()
    if (!reader) {
      throw new InferenceError('inference_failed', `${this.name} stream returned no body`)
    }

    const decoder = new TextDecoder()
    let content = ''
    let buffer = ''
    let promptTokens = 0
    let completionTokens = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const dataStr = trimmed.slice(5).trim()
        if (!dataStr || dataStr === '[DONE]') continue

        let data: OpenAIChatResponse & { choices?: { delta?: { content?: string } }[] }
        try {
          data = JSON.parse(dataStr) as typeof data
        } catch {
          continue
        }

        const delta = data.choices?.[0]?.delta?.content ?? ''
        if (delta) {
          content += delta
          onChunk({ delta })
        }

        if (data.usage) {
          promptTokens = data.usage.prompt_tokens ?? promptTokens
          completionTokens = data.usage.completion_tokens ?? completionTokens
        }
      }
    }

    if (!content.trim()) {
      throw new InferenceError('inference_failed', `${this.name} stream returned empty content`)
    }

    const usage = {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    }
    onChunk({ delta: '', done: true, usage })

    return {
      content: content.trim(),
      model: request.model,
      providerId: this.providerId,
      usage,
    }
  }

  private async streamAnthropic(request: CompletionRequest, onChunk: StreamCallback): Promise<CompletionResult> {
    const { system, conversation } = this.splitMessages(request.messages)
    const body: Record<string, unknown> = {
      model: request.model,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.2,
      messages: conversation.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      stream: true,
    }
    if (system) body.system = system

    const res = await fetch(`${this.endpoint}/v1/messages`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(INFERENCE_TIMEOUT_MS),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new InferenceError(
        'inference_failed',
        `Anthropic stream failed (HTTP ${res.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`,
      )
    }

    const reader = res.body?.getReader()
    if (!reader) {
      throw new InferenceError('inference_failed', 'Anthropic stream returned no body')
    }

    const decoder = new TextDecoder()
    let content = ''
    let buffer = ''
    let promptTokens = 0
    let completionTokens = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const dataStr = trimmed.slice(5).trim()
        if (!dataStr) continue

        let event: { type?: string; delta?: { text?: string }; message?: { usage?: { input_tokens?: number; output_tokens?: number } } }
        try {
          event = JSON.parse(dataStr) as typeof event
        } catch {
          continue
        }

        if (event.type === 'content_block_delta' && event.delta?.text) {
          content += event.delta.text
          onChunk({ delta: event.delta.text })
        }
        if (event.type === 'message_delta' && event.message?.usage) {
          completionTokens = event.message.usage.output_tokens ?? completionTokens
        }
        if (event.type === 'message_start' && event.message?.usage) {
          promptTokens = event.message.usage.input_tokens ?? promptTokens
        }
      }
    }

    if (!content.trim()) {
      throw new InferenceError('inference_failed', 'Anthropic stream returned empty content')
    }

    const usage = {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    }
    onChunk({ delta: '', done: true, usage })

    return {
      content: content.trim(),
      model: request.model,
      providerId: this.providerId,
      usage,
    }
  }

  private async completeOpenAI(request: CompletionRequest): Promise<CompletionResult> {
    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 4096,
    }
    if (request.jsonMode) {
      body.response_format = { type: 'json_object' }
    }

    try {
      const res = await fetch(`${this.endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(INFERENCE_TIMEOUT_MS),
      })

      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        throw new InferenceError(
          'inference_failed',
          `${this.name} request failed (HTTP ${res.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`,
        )
      }

      const data: OpenAIChatResponse = await res.json()
      const content = data.choices?.[0]?.message?.content?.trim() ?? ''
      if (!content) {
        throw new InferenceError('inference_failed', `${this.name} returned an empty response`)
      }

      const usage = data.usage
      return {
        content,
        model: request.model,
        providerId: this.providerId,
        usage: usage
          ? {
              promptTokens: usage.prompt_tokens ?? 0,
              completionTokens: usage.completion_tokens ?? 0,
              totalTokens: usage.total_tokens ?? (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0),
            }
          : undefined,
      }
    } catch (err) {
      if (err instanceof InferenceError) throw err
      throw new InferenceError(
        'inference_failed',
        err instanceof Error ? err.message : `${this.name} inference failed`,
      )
    }
  }

  private async completeAnthropic(request: CompletionRequest): Promise<CompletionResult> {
    const { system, conversation } = this.splitMessages(request.messages)
    const anthropicMessages = conversation.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }))

    const body: Record<string, unknown> = {
      model: request.model,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.2,
      messages: anthropicMessages,
    }
    if (system) body.system = system

    try {
      const res = await fetch(`${this.endpoint}/v1/messages`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(INFERENCE_TIMEOUT_MS),
      })

      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        throw new InferenceError(
          'inference_failed',
          `Anthropic request failed (HTTP ${res.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`,
        )
      }

      const data: AnthropicMessageResponse = await res.json()
      const content = data.content
        ?.filter(block => block.type === 'text')
        .map(block => block.text ?? '')
        .join('')
        .trim() ?? ''

      if (!content) {
        throw new InferenceError('inference_failed', 'Anthropic returned an empty response')
      }

      const inputTokens = data.usage?.input_tokens ?? 0
      const outputTokens = data.usage?.output_tokens ?? 0

      return {
        content,
        model: request.model,
        providerId: this.providerId,
        usage: {
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens: inputTokens + outputTokens,
        },
      }
    } catch (err) {
      if (err instanceof InferenceError) throw err
      throw new InferenceError(
        'inference_failed',
        err instanceof Error ? err.message : 'Anthropic inference failed',
      )
    }
  }
}
