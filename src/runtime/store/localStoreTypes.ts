import type {
  AppendEventInput,
  CreateProjectInput,
  GraphEdge,
  GraphNode,
  Project,
  ProjectWithGraph,
  StoredEvent,
  StoredSession,
  UpdateProjectInput,
} from '../../types/graph'

export interface StoreInitResult {
  available: boolean
  dbPath: string
  schemaVersion: number
  isEmpty: boolean
}

export interface StoreStatus {
  projectCount: number
  nodeCount: number
  edgeCount: number
  eventCount: number
  sessionCount: number
}

export interface UpsertNodeInput {
  id?: string
  projectId: string
  type: GraphNode['type']
  parentId?: string | null
  title: string
  description?: string
  status?: GraphNode['status']
  acceptanceCriteria?: string[]
  assignedRole?: string | null
  assignedSessionId?: string | null
  branch?: string | null
  metadata?: Record<string, unknown>
}

export interface UpsertEdgeInput {
  id?: string
  projectId: string
  fromNodeId: string
  toNodeId: string
  edgeType?: GraphEdge['edgeType']
}

export interface UpsertSessionInput {
  id?: string
  projectId: string
  nodeId?: string | null
  data: Record<string, unknown>
}

export interface ListEventsOptions {
  projectId?: string | null
  limit?: number
  offset?: number
}

export interface LocalStore {
  readonly available: boolean
  init(): Promise<StoreInitResult>
  getStatus(): Promise<StoreStatus>
  listProjects(): Promise<Project[]>
  createProject(input: CreateProjectInput): Promise<Project>
  updateProject(input: UpdateProjectInput): Promise<Project>
  getProject(projectId: string): Promise<ProjectWithGraph | null>
  upsertNode(input: UpsertNodeInput): Promise<GraphNode>
  deleteNode(nodeId: string): Promise<void>
  upsertEdge(input: UpsertEdgeInput): Promise<GraphEdge>
  deleteEdge(edgeId: string): Promise<void>
  appendEvent(input: AppendEventInput): Promise<StoredEvent>
  listEvents(options?: ListEventsOptions): Promise<StoredEvent[]>
  upsertSession(input: UpsertSessionInput): Promise<StoredSession>
  listSessions(projectId: string): Promise<StoredSession[]>
}
