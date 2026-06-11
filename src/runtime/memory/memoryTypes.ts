import type { AgentMemory, AgentMemoryType, Project } from '../../types/graph'
import type { AgentRole } from '../inference/modelRouting'

export type { AgentMemory, AgentMemoryType }

export interface RecallOptions {
  projectId: string
  nodeId?: string
  agentRole: AgentRole | 'planner'
  query?: string
  limit?: number
  epicId?: string
  sessionId?: string
}

export interface RecallResult {
  memories: AgentMemory[]
  formattedBlock: string
}

export interface MemoryBundle {
  project: Project
  memories: AgentMemory[]
  events: Array<Record<string, unknown>>
  epicIds: string[]
}
