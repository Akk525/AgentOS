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
import type {
  ListEventsOptions,
  LocalStore,
  StoreInitResult,
  StoreStatus,
  UpsertEdgeInput,
  UpsertNodeInput,
  UpsertSessionInput,
} from './localStoreTypes'

const projects = new Map<string, Project>()
const nodes = new Map<string, GraphNode>()
const edges = new Map<string, GraphEdge>()
const events: StoredEvent[] = []
const sessions = new Map<string, StoredSession>()

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function now(): string {
  return new Date().toISOString()
}

function status(): StoreStatus {
  return {
    projectCount: projects.size,
    nodeCount: nodes.size,
    edgeCount: edges.size,
    eventCount: events.length,
    sessionCount: sessions.size,
  }
}

function buildNode(input: UpsertNodeInput, existing?: GraphNode): GraphNode {
  const ts = now()
  return {
    id: input.id ?? uid('node'),
    projectId: input.projectId,
    type: input.type,
    parentId: input.parentId ?? null,
    title: input.title,
    description: input.description ?? '',
    status: input.status ?? 'pending',
    acceptanceCriteria: input.acceptanceCriteria ?? [],
    assignedRole: input.assignedRole ?? null,
    assignedSessionId: input.assignedSessionId ?? null,
    branch: input.branch ?? null,
    metadata: input.metadata ?? {},
    createdAt: existing?.createdAt ?? ts,
    updatedAt: ts,
  }
}

export const memoryLocalStore: LocalStore = {
  available: true,

  async init(): Promise<StoreInitResult> {
    return {
      available: true,
      dbPath: '(memory)',
      schemaVersion: 1,
      isEmpty: projects.size === 0,
    }
  },

  async getStatus(): Promise<StoreStatus> {
    return status()
  },

  async listProjects(): Promise<Project[]> {
    return [...projects.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async createProject(input: CreateProjectInput): Promise<Project> {
    const ts = now()
    const project: Project = {
      id: uid('proj'),
      title: input.title,
      goalText: input.goalText,
      governanceMode: input.governanceMode ?? 'assisted',
      createdAt: ts,
      updatedAt: ts,
    }
    projects.set(project.id, project)
    return project
  },

  async updateProject(input: UpdateProjectInput): Promise<Project> {
    const existing = projects.get(input.projectId)
    if (!existing) throw new Error(`Project not found: ${input.projectId}`)
    const updated: Project = {
      ...existing,
      title: input.title ?? existing.title,
      governanceMode: input.governanceMode ?? existing.governanceMode,
      updatedAt: now(),
    }
    projects.set(updated.id, updated)
    return updated
  },

  async getProject(projectId: string): Promise<ProjectWithGraph | null> {
    const project = projects.get(projectId)
    if (!project) return null
    const projectNodes = [...nodes.values()].filter(n => n.projectId === projectId)
    const projectEdges = [...edges.values()].filter(e => e.projectId === projectId)
    return { project, nodes: projectNodes, edges: projectEdges }
  },

  async upsertNode(input: UpsertNodeInput): Promise<GraphNode> {
    const existing = input.id ? nodes.get(input.id) : undefined
    const node = buildNode(input, existing)
    nodes.set(node.id, node)
    return node
  },

  async deleteNode(nodeId: string): Promise<void> {
    nodes.delete(nodeId)
    for (const [id, e] of edges) {
      if (e.fromNodeId === nodeId || e.toNodeId === nodeId) edges.delete(id)
    }
  },

  async upsertEdge(input: UpsertEdgeInput): Promise<GraphEdge> {
    const edge: GraphEdge = {
      id: input.id ?? uid('edge'),
      projectId: input.projectId,
      fromNodeId: input.fromNodeId,
      toNodeId: input.toNodeId,
      edgeType: input.edgeType ?? 'depends_on',
    }
    edges.set(edge.id, edge)
    return edge
  },

  async deleteEdge(edgeId: string): Promise<void> {
    edges.delete(edgeId)
  },

  async appendEvent(input: AppendEventInput): Promise<StoredEvent> {
    const ev: StoredEvent = {
      id: uid('evt'),
      projectId: input.projectId ?? null,
      sessionId: input.sessionId ?? null,
      nodeId: input.nodeId ?? null,
      type: input.type,
      message: input.message,
      severity: input.severity ?? 'info',
      payload: input.payload ?? {},
      timestamp: now(),
    }
    events.unshift(ev)
    return ev
  },

  async listEvents(options: ListEventsOptions = {}): Promise<StoredEvent[]> {
    const { projectId, nodeId, sessionId, limit = 100, offset = 0, order = 'desc' } = options
    let list = [...events]
    if (projectId) list = list.filter(e => e.projectId === projectId)
    if (nodeId) list = list.filter(e => e.nodeId === nodeId)
    if (sessionId) list = list.filter(e => e.sessionId === sessionId)
    list = list.sort((a, b) =>
      order === 'asc'
        ? a.timestamp.localeCompare(b.timestamp)
        : b.timestamp.localeCompare(a.timestamp),
    )
    return list.slice(offset, offset + limit)
  },

  async upsertSession(input: UpsertSessionInput): Promise<StoredSession> {
    const ts = now()
    const existing = input.id ? sessions.get(input.id) : undefined
    const session: StoredSession = {
      id: input.id ?? uid('sess'),
      projectId: input.projectId,
      nodeId: input.nodeId ?? null,
      data: input.data,
      createdAt: existing?.createdAt ?? ts,
      updatedAt: ts,
    }
    sessions.set(session.id, session)
    return session
  },

  async listSessions(projectId: string): Promise<StoredSession[]> {
    return [...sessions.values()].filter(s => s.projectId === projectId)
  },
}

export function resetMemoryLocalStore(): void {
  projects.clear()
  nodes.clear()
  edges.clear()
  events.length = 0
  sessions.clear()
}
