import type { GraphNode } from '../types/graph'
import { runBuilderForNode } from './agents/builderAgent'
import { runReviewerForNode } from './agents/reviewerAgent'
import { persistReviewVerdict } from './execution/persistExecution'
import { getAutoRunEnabled, getRepoPath, setAutoRunEnabled, setRepoPath } from './execution/executionConfig'
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

function isBuilderNode(node: GraphNode): boolean {
  const role = node.assignedRole ?? (node.metadata.role as string | undefined)
  return role === 'builder'
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

    this.unsubGraph = taskGraphEngine.subscribe(() => {
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
    if (!isBuilderNode(node)) {
      throw new Error('Only builder tasks can be auto-executed in Sprint 6')
    }

    const repoPath = getRepoPath()
    if (!repoPath) {
      throw new Error('Mount a workspace before running tasks')
    }

    await this.executeBuilder(node, project, repoPath)
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
    const next = graphState.nodes.find(
      n => readyIds.has(n.id) && n.type === 'task' && isBuilderNode(n),
    )
    if (!next) return

    await this.executeBuilder(next, project, repoPath)
  }

  private async executeBuilder(
    node: GraphNode,
    project: NonNullable<ReturnType<typeof taskGraphEngine.getState>['activeProject']>,
    repoPath: string,
  ): Promise<void> {
    this.patch({ running: true, activeNodeId: node.id, lastError: null })

    try {
      const meta = node.metadata as Record<string, unknown>
      await runBuilderForNode(node, project, {
        repoPath,
        providerId: meta.provider as string | undefined,
        modelId: meta.model as string | undefined,
      })

      await orchestratorRuntime.refreshFromStore()

      const updated = taskGraphEngine.getState().nodes.find(n => n.id === node.id)
      if (updated?.status === 'review') {
        await runReviewerForNode(updated, project)
        await orchestratorRuntime.refreshFromStore()
      }
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
}

export const executionCoordinator = new ExecutionCoordinator()
