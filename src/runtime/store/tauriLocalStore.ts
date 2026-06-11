import { invoke } from '@tauri-apps/api/core'
import type {
  AgentMemory,
  AppendEventInput,
  CreateProjectInput,
  GraphEdge,
  GraphNode,
  ListMemoriesOptions,
  Project,
  ProjectWithGraph,
  SearchMemoriesOptions,
  StoredEvent,
  StoredSession,
  UpdateProjectInput,
  UpsertMemoryInput,
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

function mapProject(raw: Record<string, unknown>): Project {
  return {
    id: raw.id as string,
    title: raw.title as string,
    goalText: raw.goalText as string,
    governanceMode: raw.governanceMode as Project['governanceMode'],
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string,
  }
}

function mapNode(raw: Record<string, unknown>): GraphNode {
  return {
    id: raw.id as string,
    projectId: raw.projectId as string,
    type: raw.type as GraphNode['type'],
    parentId: (raw.parentId as string | null) ?? null,
    title: raw.title as string,
    description: raw.description as string,
    status: raw.status as GraphNode['status'],
    acceptanceCriteria: (raw.acceptanceCriteria as string[]) ?? [],
    assignedRole: (raw.assignedRole as string | null) ?? null,
    assignedSessionId: (raw.assignedSessionId as string | null) ?? null,
    branch: (raw.branch as string | null) ?? null,
    metadata: (raw.metadata as Record<string, unknown>) ?? {},
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string,
  }
}

function mapEdge(raw: Record<string, unknown>): GraphEdge {
  return {
    id: raw.id as string,
    projectId: raw.projectId as string,
    fromNodeId: raw.fromNodeId as string,
    toNodeId: raw.toNodeId as string,
    edgeType: raw.edgeType as GraphEdge['edgeType'],
  }
}

function mapEvent(raw: Record<string, unknown>): StoredEvent {
  return {
    id: raw.id as string,
    projectId: (raw.projectId as string | null) ?? null,
    sessionId: (raw.sessionId as string | null) ?? null,
    nodeId: (raw.nodeId as string | null) ?? null,
    type: raw.type as string,
    message: raw.message as string,
    severity: raw.severity as StoredEvent['severity'],
    payload: (raw.payload as Record<string, unknown>) ?? {},
    timestamp: raw.timestamp as string,
  }
}

function mapMemory(raw: Record<string, unknown>): AgentMemory {
  return {
    id: raw.id as string,
    projectId: raw.projectId as string,
    nodeId: (raw.nodeId as string | null) ?? null,
    agentRole: (raw.agentRole as string | null) ?? null,
    memoryType: raw.memoryType as AgentMemory['memoryType'],
    content: raw.content as string,
    tags: (raw.tags as string[]) ?? [],
    sourceEventId: (raw.sourceEventId as string | null) ?? null,
    createdAt: raw.createdAt as string,
  }
}

function mapSession(raw: Record<string, unknown>): StoredSession {
  return {
    id: raw.id as string,
    projectId: raw.projectId as string,
    nodeId: (raw.nodeId as string | null) ?? null,
    data: (raw.data as Record<string, unknown>) ?? {},
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string,
  }
}

export const tauriLocalStore: LocalStore = {
  available: true,

  async init(): Promise<StoreInitResult> {
    return invoke<StoreInitResult>('store_init')
  },

  async getStatus(): Promise<StoreStatus> {
    return invoke<StoreStatus>('store_get_status')
  },

  async listProjects(): Promise<Project[]> {
    const rows = await invoke<Record<string, unknown>[]>('store_list_projects')
    return rows.map(mapProject)
  },

  async createProject(input: CreateProjectInput): Promise<Project> {
    const raw = await invoke<Record<string, unknown>>('store_create_project', {
      input: {
        title: input.title,
        goalText: input.goalText,
        governanceMode: input.governanceMode,
      },
    })
    return mapProject(raw)
  },

  async updateProject(input: UpdateProjectInput): Promise<Project> {
    const raw = await invoke<Record<string, unknown>>('store_update_project', {
      input: {
        projectId: input.projectId,
        title: input.title,
        governanceMode: input.governanceMode,
      },
    })
    return mapProject(raw)
  },

  async getProject(projectId: string): Promise<ProjectWithGraph | null> {
    const raw = await invoke<Record<string, unknown> | null>('store_get_project', { projectId })
    if (!raw) return null
    return {
      project: mapProject(raw.project as Record<string, unknown>),
      nodes: ((raw.nodes as Record<string, unknown>[]) ?? []).map(mapNode),
      edges: ((raw.edges as Record<string, unknown>[]) ?? []).map(mapEdge),
    }
  },

  async upsertNode(input: UpsertNodeInput): Promise<GraphNode> {
    const raw = await invoke<Record<string, unknown>>('store_upsert_node', {
      input: {
        id: input.id,
        projectId: input.projectId,
        type: input.type,
        parentId: input.parentId,
        title: input.title,
        description: input.description,
        status: input.status,
        acceptanceCriteria: input.acceptanceCriteria,
        assignedRole: input.assignedRole,
        assignedSessionId: input.assignedSessionId,
        branch: input.branch,
        metadata: input.metadata,
      },
    })
    return mapNode(raw)
  },

  async deleteNode(nodeId: string): Promise<void> {
    await invoke('store_delete_node', { nodeId })
  },

  async upsertEdge(input: UpsertEdgeInput): Promise<GraphEdge> {
    const raw = await invoke<Record<string, unknown>>('store_upsert_edge', {
      input: {
        id: input.id,
        projectId: input.projectId,
        fromNodeId: input.fromNodeId,
        toNodeId: input.toNodeId,
        edgeType: input.edgeType,
      },
    })
    return mapEdge(raw)
  },

  async deleteEdge(edgeId: string): Promise<void> {
    await invoke('store_delete_edge', { edgeId })
  },

  async appendEvent(input: AppendEventInput): Promise<StoredEvent> {
    const raw = await invoke<Record<string, unknown>>('store_append_event', {
      input: {
        projectId: input.projectId,
        sessionId: input.sessionId,
        nodeId: input.nodeId,
        type: input.type,
        message: input.message,
        severity: input.severity,
        payload: input.payload,
      },
    })
    return mapEvent(raw)
  },

  async listEvents(options: ListEventsOptions = {}): Promise<StoredEvent[]> {
    const rows = await invoke<Record<string, unknown>[]>('store_list_events', {
      input: {
        projectId: options.projectId,
        nodeId: options.nodeId,
        sessionId: options.sessionId,
        limit: options.limit,
        offset: options.offset,
        order: options.order,
      },
    })
    return rows.map(mapEvent)
  },

  async upsertSession(input: UpsertSessionInput): Promise<StoredSession> {
    const raw = await invoke<Record<string, unknown>>('store_upsert_session', {
      input: {
        id: input.id,
        projectId: input.projectId,
        nodeId: input.nodeId,
        data: input.data,
      },
    })
    return mapSession(raw)
  },

  async listSessions(projectId: string): Promise<StoredSession[]> {
    const rows = await invoke<Record<string, unknown>[]>('store_list_sessions', { projectId })
    return rows.map(mapSession)
  },

  async upsertMemory(input: UpsertMemoryInput): Promise<AgentMemory> {
    const raw = await invoke<Record<string, unknown>>('store_upsert_memory', {
      input: {
        id: input.id,
        projectId: input.projectId,
        nodeId: input.nodeId,
        agentRole: input.agentRole,
        memoryType: input.memoryType,
        content: input.content,
        tags: input.tags,
        sourceEventId: input.sourceEventId,
      },
    })
    return mapMemory(raw)
  },

  async listMemories(options: ListMemoriesOptions): Promise<AgentMemory[]> {
    const rows = await invoke<Record<string, unknown>[]>('store_list_memories', {
      input: {
        projectId: options.projectId,
        memoryType: options.memoryType,
        agentRole: options.agentRole,
        limit: options.limit,
        offset: options.offset,
      },
    })
    return rows.map(mapMemory)
  },

  async searchMemories(options: SearchMemoriesOptions): Promise<AgentMemory[]> {
    const rows = await invoke<Record<string, unknown>[]>('store_search_memories', {
      input: {
        projectId: options.projectId,
        query: options.query,
        limit: options.limit,
      },
    })
    return rows.map(mapMemory)
  },

  async deleteMemory(memoryId: string): Promise<void> {
    await invoke('store_delete_memory', { memoryId })
  },
}
