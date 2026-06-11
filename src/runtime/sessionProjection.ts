import type { SessionData } from '../types'
import type { StoredSession } from '../types/graph'

export function storedSessionToSessionData(stored: StoredSession, taskId: string): SessionData {
  const data = stored.data as Partial<SessionData>

  return {
    taskId,
    events: data.events ?? [],
    toolCalls: data.toolCalls ?? [],
    testResults: data.testResults ?? [],
    diff: data.diff ?? [],
    terminalOutput: data.terminalOutput ?? [],
    completionNote: data.completionNote,
    totalTokens: data.totalTokens,
    totalCostUsd: data.totalCostUsd,
  }
}
