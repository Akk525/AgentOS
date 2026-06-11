export type GovernanceMode = 'manual' | 'assisted' | 'autonomous' | 'full_auto'

export type GraphNodeType = 'epic' | 'task'

export type GraphNodeStatus =
  | 'pending'
  | 'assigned'
  | 'running'
  | 'review'
  | 'done'
  | 'blocked'
  | 'failed'

export type GraphEdgeType = 'depends_on' | 'blocks'

export type StoredEventSeverity = 'info' | 'warning' | 'success' | 'error'

export interface Project {
  id: string
  title: string
  goalText: string
  governanceMode: GovernanceMode
  createdAt: string
  updatedAt: string
}

export interface GraphNode {
  id: string
  projectId: string
  type: GraphNodeType
  parentId: string | null
  title: string
  description: string
  status: GraphNodeStatus
  acceptanceCriteria: string[]
  assignedRole: string | null
  assignedSessionId: string | null
  branch: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface GraphEdge {
  id: string
  projectId: string
  fromNodeId: string
  toNodeId: string
  edgeType: GraphEdgeType
}

export interface StoredEvent {
  id: string
  projectId: string | null
  sessionId: string | null
  nodeId: string | null
  type: string
  message: string
  severity: StoredEventSeverity
  payload: Record<string, unknown>
  timestamp: string
}

export interface StoredSession {
  id: string
  projectId: string
  nodeId: string | null
  data: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ProjectWithGraph {
  project: Project
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface CreateProjectInput {
  title: string
  goalText: string
  governanceMode?: GovernanceMode
}

export interface UpdateProjectInput {
  projectId: string
  title?: string
  governanceMode?: GovernanceMode
}

export interface AppendEventInput {
  projectId?: string | null
  sessionId?: string | null
  nodeId?: string | null
  type: string
  message: string
  severity?: StoredEventSeverity
  payload?: Record<string, unknown>
}
