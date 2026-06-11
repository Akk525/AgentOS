import type { CreateProjectInput, GraphEdge, GraphNode, Project } from '../types/graph'
import { computeBlockedNodes, computeReadyNodes } from './graphExecutor'
import { getLocalStore } from './store'
import type { UpsertEdgeInput, UpsertNodeInput } from './store/localStoreTypes'

const ACTIVE_PROJECT_KEY = 'agentos.activeProjectId'

export interface TaskGraphState {
  loaded: boolean
  activeProject: Project | null
  nodes: GraphNode[]
  edges: GraphEdge[]
  readyNodeIds: string[]
  blockedNodeIds: string[]
}

type TaskGraphListener = (state: TaskGraphState) => void

const emptyState: TaskGraphState = {
  loaded: false,
  activeProject: null,
  nodes: [],
  edges: [],
  readyNodeIds: [],
  blockedNodeIds: [],
}

class TaskGraphEngine {
  private state: TaskGraphState = { ...emptyState }
  private listeners = new Set<TaskGraphListener>()
  private initPromise: Promise<void> | null = null

  getState(): TaskGraphState {
    return this.state
  }

  subscribe(fn: TaskGraphListener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private notify(): void {
    this.listeners.forEach(fn => fn(this.state))
  }

  private patch(updates: Partial<TaskGraphState>): void {
    this.state = { ...this.state, ...updates }
    this.notify()
  }

  private recomputeExecutor(): void {
    const readyNodeIds = computeReadyNodes(this.state.nodes, this.state.edges)
    const blockedNodeIds = computeBlockedNodes(this.state.nodes, this.state.edges)
    this.patch({ readyNodeIds, blockedNodeIds })
  }

  private async loadProject(projectId: string): Promise<void> {
    const graph = await getLocalStore().getProject(projectId)
    if (!graph) {
      this.patch({ loaded: true, activeProject: null, nodes: [], edges: [], readyNodeIds: [], blockedNodeIds: [] })
      return
    }
    localStorage.setItem(ACTIVE_PROJECT_KEY, projectId)
    const readyNodeIds = computeReadyNodes(graph.nodes, graph.edges)
    const blockedNodeIds = computeBlockedNodes(graph.nodes, graph.edges)
    this.patch({
      loaded: true,
      activeProject: graph.project,
      nodes: graph.nodes,
      edges: graph.edges,
      readyNodeIds,
      blockedNodeIds,
    })
  }

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise
    this.initPromise = this.doInit()
    return this.initPromise
  }

  private async doInit(): Promise<void> {
    const store = getLocalStore()
    if (!store.available) {
      this.patch({ loaded: true })
      return
    }

    const projects = await store.listProjects()
    const activeId =
      localStorage.getItem(ACTIVE_PROJECT_KEY) ??
      projects[0]?.id ??
      null

    if (activeId) {
      await this.loadProject(activeId)
    } else {
      this.patch({ loaded: true })
    }
  }

  async setActiveProject(projectId: string): Promise<void> {
    await this.loadProject(projectId)
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    const store = getLocalStore()
    const project = await store.createProject(input)
    await store.appendEvent({
      projectId: project.id,
      type: 'plan_created',
      message: `Project created: ${project.title}`,
      severity: 'info',
    })
    await this.loadProject(project.id)
    return project
  }

  getReadyNodes(): GraphNode[] {
    const ids = new Set(this.state.readyNodeIds)
    return this.state.nodes.filter(n => ids.has(n.id))
  }

  getBlockedNodes(): GraphNode[] {
    const ids = new Set(this.state.blockedNodeIds)
    return this.state.nodes.filter(n => ids.has(n.id))
  }

  async upsertNode(input: UpsertNodeInput): Promise<GraphNode> {
    const node = await getLocalStore().upsertNode(input)
    const nodes = [...this.state.nodes.filter(n => n.id !== node.id), node]
    this.patch({ nodes })
    this.recomputeExecutor()
    return node
  }

  async upsertEdge(input: UpsertEdgeInput): Promise<GraphEdge> {
    const edge = await getLocalStore().upsertEdge(input)
    const edges = [...this.state.edges.filter(e => e.id !== edge.id), edge]
    this.patch({ edges })
    this.recomputeExecutor()
    return edge
  }

  async transitionNode(nodeId: string, status: GraphNode['status']): Promise<void> {
    const node = this.state.nodes.find(n => n.id === nodeId)
    if (!node) return

    await getLocalStore().upsertNode({
      id: node.id,
      projectId: node.projectId,
      type: node.type,
      parentId: node.parentId,
      title: node.title,
      description: node.description,
      status,
      acceptanceCriteria: node.acceptanceCriteria,
      assignedRole: node.assignedRole,
      assignedSessionId: node.assignedSessionId,
      branch: node.branch,
      metadata: node.metadata,
    })

    await getLocalStore().appendEvent({
      projectId: node.projectId,
      nodeId: node.id,
      type: 'subtask_assigned',
      message: `Node ${node.title} → ${status}`,
      severity: 'info',
    })

    const nodes = this.state.nodes.map(n => (n.id === nodeId ? { ...n, status } : n))
    this.patch({ nodes })
    this.recomputeExecutor()
  }
}

export const taskGraphEngine = new TaskGraphEngine()
