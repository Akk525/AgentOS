import type { GraphNodeStatus } from '../../types/graph'
import type { DiffFile, OrchestratorEventSeverity, TraceEvent } from '../../types'

export interface ReplayScope {
  projectId: string
  nodeId?: string
  epicId?: string
  sessionId?: string
}

export interface ReplayStep {
  id: string
  timestamp: string
  source: 'stored' | 'trace'
  type: string
  message: string
  nodeId?: string
  sessionId?: string
  severity?: OrchestratorEventSeverity
  payload?: Record<string, unknown>
}

export interface ReplaySnapshot {
  stepIndex: number
  step: ReplayStep
  nodeTitle?: string
  nodeStatus?: GraphNodeStatus
  tokensUsed?: number
  costUsd?: number
  diff?: DiffFile[]
  terminalTail?: string[]
  traceEvents?: TraceEvent[]
  cumulativeTokens?: number
  cumulativeCostUsd?: number
}

export interface ProvenanceChainLink {
  id: string
  kind: 'project' | 'epic' | 'task' | 'event'
  title: string
  role?: string
  status?: string
}

export interface ProvenanceChain {
  projectTitle: string
  goalText: string
  epic?: ProvenanceChainLink
  tasks: ProvenanceChainLink[]
  stepCount: number
  links: ProvenanceChainLink[]
}

export interface ProvenanceBundle {
  project: Record<string, unknown>
  epic: Record<string, unknown> | null
  tasks: Record<string, unknown>[]
  events: Record<string, unknown>[]
  sessions: Record<string, unknown>[]
}
