export type CompletionRole = 'system' | 'user' | 'assistant'

export interface CompletionMessage {
  role: CompletionRole
  content: string
}

export interface CompletionRequest {
  model: string
  messages: CompletionMessage[]
  temperature?: number
  jsonMode?: boolean
  maxTokens?: number
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface CompletionResult {
  content: string
  usage?: TokenUsage
  model: string
  providerId: string
}

export type InferenceErrorCode = 'unconfigured' | 'inference_failed' | 'invalid_plan'

export class InferenceError extends Error {
  readonly code: InferenceErrorCode

  constructor(code: InferenceErrorCode, message: string) {
    super(message)
    this.name = 'InferenceError'
    this.code = code
  }
}
