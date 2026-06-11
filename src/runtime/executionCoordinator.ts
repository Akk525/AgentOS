import type { GraphNode } from '../types/graph'
import { runBuilderForNode } from './agents/builderAgent'
import { runReviewerForNode } from './agents/reviewerAgent'
import { runTestWriterForNode } from './agents/testWriterAgent'
import { persistReviewVerdict } from './execution/persistExecution'
import { spawnReviewFixTask } from './execution/spawnReviewFixTask'
import { getAutoRunEnabled, getRepoPath, setAutoRunEnabled, setRepoPath } from './execution/executionConfig'
import {
  autoRunEnabledByDefault,
  shouldAutoActOnReviewerVerdict,
} from './governance/governancePolicy'
import type { GovernanceMode } from '../types/graph'
import { getNodeRole } from './graphWorktree'
import { taskGraphEngine } from './taskGraphEngine'
import { orchestratorRuntime } from './orchestratorRuntime'

export type CoordinatorPausedReason = 'no_workspace' | 'manual_pause' | null

export interface ExecutionCoordinatorState {
  running: boolean
  autoRun: boolean
  activeNodeId: string | null
  pausedReason: CoordinatorPausedReason
  lastError: string | null
}

type CoordinatorListener = (state: ExecutionCoordinatorState) => void

const EXECUTABLE_ROLES = ['builder', 'test-writer', 'reviewer'] as const
type ExecutableRole = (typeof EXECUTABLE_ROLES)[number]

const ROLE_PRIORITY: ExecutableRole[] = ['builder', 'test-writer', 'reviewer']

function isExecutableNode(node: GraphNode): boolean {
  const role = getNodeRole(node)
  return EXECUTABLE_ROLES.includes(role as ExecutableRole)
}

function pickNextReadyNode(nodes: GraphNode[], readyIds: Set<string>): GraphNode | undefined {
  for (const role of ROLE_PRIORITY) {
    const found = nodes.find(
      n => readyIds.has(n.id) && n.type === 'task' && getNodeRole(n) === role,
    )
    if (found) return found
  }
  return undefined
}

class ExecutionCoordinator {
  private state: ExecutionCoordinatorState = {
    running: false,
    autoRun: getAutoRunEnabled(),
    activeNodeId: null,
    pausedReason: null,
    lastError: null,
  }

  private listeners = new Set<CoordinatorListener>()
  private started = false
  private tickTimer: ReturnType<typeof setInterval> | null = null
  private unsubGraph: (() => void) | null = null

  getState(): ExecutionCoordinatorState {
    return this.state
  }

  subscribe(fn: CoordinatorListener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private patch(updates: Partial<ExecutionCoordinatorState>): void {
    this.state = { ...this.state, ...updates }
    this.listeners.forEach(fn => fn(this.state))
  }

  private syncGovernanceFromProject(): void {
    const project = taskGraphEngine.getState().activeProject
    if (!project) return

    if (project.governanceMode === 'manual' && this.state.autoRun) {
      setAutoRunEnabled(false)
      this.patch({ autoRun: false })
      this.refreshPausedReason()
    }
  }

  private refreshPausedReason(): void {
    if (!this.state.autoRun) {
      this.patch({ pausedReason: 'manual_pause' })
      return
    }
    if (!getRepoPath()) {
      this.patch({ pausedReason: 'no_workspace' })
      return
    }
    this.patch({ pausedReason: null })
  }

  async start(): Promise<void> {
    if (this.started) return
    this.started = true

    await taskGraphEngine.init()
    this.syncGovernanceFromProject()

    this.unsubGraph = taskGraphEngine.subscribe(() => {
      this.syncGovernanceFromProject()
      void orchestratorRuntime.refreshFromStore()
      if (this.state.autoRun && !this.state.running) {
        void this.tick()
      }
    })

    this.tickTimer = setInterval(() => {
      if (this.state.autoRun && !this.state.running) {
        void this.tick()
      }
    }, 3000)

    this.refreshPausedReason()
    if (this.state.autoRun) {
      void this.tick()
    }
  }

  stop(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer)
      this.tickTimer = null
    }
    this.unsubGraph?.()
    this.unsubGraph = null
    this.started = false
  }

  setAutoRun(enabled: boolean): void {
    setAutoRunEnabled(enabled)
    this.patch({ autoRun: enabled })
    this.refreshPausedReason()
    if (enabled && !this.state.running) {
      void this.tick()
    }
  }

  applyGovernanceMode(mode: GovernanceMode): void {
    if (mode === 'manual') {
      this.setAutoRun(false)
      return
    }
    if (autoRunEnabledByDefault(mode)) {
      this.setAutoRun(true)
    }
  }

  notifyRepoPath(path: string | null): void {
    setRepoPath(path)
    this.refreshPausedReason()
    if (this.state.autoRun && !this.state.running) {
      void this.tick()
    }
  }

  async runNode(nodeId: string): Promise<void> {
    if (this.state.running) {
      throw new Error('Another task is already running')
    }

    const graphState = taskGraphEngine.getState()
    const node = graphState.nodes.find(n => n.id === nodeId)
    const project = graphState.activeProject
    if (!node || !project) {
      throw new Error('Task not found')
    }
    if (node.type !== 'task') {
      throw new Error('Only task nodes can be executed')
    }
    if (!isExecutableNode(node)) {
      throw new Error(`Task role "${getNodeRole(node)}" cannot be executed`)
    }

    const repoPath = getRepoPath()
    if (!repoPath) {
      throw new Error('Mount a workspace before running tasks')
    }

    await this.executeNode(node, project, repoPath)
  }

  private async tick(): Promise<void> {
    if (this.state.running) return
    this.refreshPausedReason()
    if (this.state.pausedReason) return

    const repoPath = getRepoPath()
    if (!repoPath) return

    const graphState = taskGraphEngine.getState()
    const project = graphState.activeProject
    if (!project) return

    const readyIds = new Set(graphState.readyNodeIds)
    const next = pickNextReadyNode(graphState.nodes, readyIds)
    if (!next) return

    await this.executeNode(next, project, repoPath)
  }

  private async executeNode(
    node: GraphNode,
    project: NonNullable<ReturnType<typeof taskGraphEngine.getState>['activeProject']>,
    repoPath: string,
  ): Promise<void> {
    const role = getNodeRole(node)
    this.patch({ running: true, activeNodeId: node.id, lastError: null })

    try {
      const meta = node.metadata as Record<string, unknown>
      const opts = {
        repoPath,
        providerId: meta.provider as string | undefined,
        modelId: meta.model as string | undefined,
      }

      if (role === 'builder') {
        await runBuilderForNode(node, project, opts)
      } else if (role === 'test-writer') {
        await runTestWriterForNode(node, project, { repoPath })
      } else if (role === 'reviewer') {
        const review = await runReviewerForNode(node, project)
        await orchestratorRuntime.refreshFromStore()

        if (shouldAutoActOnReviewerVerdict(project.governanceMode, review.verdict)) {
          if (review.verdict === 'approve') {
            await this.approveReview(node.id)
          } else if (review.verdict === 'reject') {
            await this.rejectReview(node.id)
          } else if (review.verdict === 'request_changes') {
            await this.requestReviewChanges(node.id, review.summary)
          }
        }
        return
      }

      await orchestratorRuntime.refreshFromStore()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Execution failed'
      this.patch({ lastError: message })
      await taskGraphEngine.transitionNode(node.id, 'failed', {
        blockReason: message,
      })
      await orchestratorRuntime.refreshFromStore()
    } finally {
      this.patch({ running: false, activeNodeId: null })
    }
  }

  async approveReview(nodeId: string): Promise<void> {
    const graphState = taskGraphEngine.getState()
    const node = graphState.nodes.find(n => n.id === nodeId)
    const project = graphState.activeProject
    if (!node || !project) return

    await persistReviewVerdict({
      node,
      project,
      sessionId: node.assignedSessionId ?? `sess-${node.id}`,
      approved: true,
    })
    await orchestratorRuntime.refreshFromStore()
  }

  async rejectReview(nodeId: string): Promise<void> {
    const graphState = taskGraphEngine.getState()
    const node = graphState.nodes.find(n => n.id === nodeId)
    const project = graphState.activeProject
    if (!node || !project) return

    await persistReviewVerdict({
      node,
      project,
      sessionId: node.assignedSessionId ?? `sess-${node.id}`,
      approved: false,
    })
    await orchestratorRuntime.refreshFromStore()
  }

  async requestReviewChanges(nodeId: string, note: string): Promise<void> {
    const graphState = taskGraphEngine.getState()
    const node = graphState.nodes.find(n => n.id === nodeId)
    const project = graphState.activeProject
    if (!node || !project) return

    const trimmed = note.trim() || 'Address review feedback'
    await spawnReviewFixTask({
      project,
      reviewerNode: node,
      changeNote: trimmed,
      nodes: graphState.nodes,
      edges: graphState.edges,
    })
    await orchestratorRuntime.refreshFromStore()
  }
}

export const executionCoordinator = new ExecutionCoordinator()
