import type {
  ActiveSession, RuntimeLoad, ReviewSession,
  OrchestratorEvent, RuntimeQueueEntry, SessionDependency,
  RuntimePlan, RuntimeReasoning, RuntimeBlocker,
} from '../types'
import { getLocalStore } from './store'
import { orchestratorEventToAppendInput, storedEventToOrchestrator } from './eventProjection'
import { graphToActiveSessions, graphToReviewSessions, graphToSessionDependencies } from './orchestrationProjection'
import { taskGraphEngine } from './taskGraphEngine'

export interface OrchestratorState {
  activeSessions: ActiveSession[]
  dependencies: SessionDependency[]
  runtimeQueue: RuntimeQueueEntry[]
  runtimeLoad: RuntimeLoad
  reviewSessions: ReviewSession[]
  timeline: OrchestratorEvent[]
  runtimePlans: RuntimePlan[]
  reasoning: RuntimeReasoning[]
  blockers: RuntimeBlocker[]
}

type OrchestratorListener = (state: OrchestratorState) => void

const ts = () => new Date().toISOString()
const uid = () => `oe-live-${Date.now()}`

const defaultRuntimeLoad: RuntimeLoad = {
  cpuPercent: 0,
  memoryMb: 512,
  memoryMaxMb: 8192,
  activeSessions: 0,
  maxConcurrentSessions: 6,
  tokenThroughputPerSec: 0,
  providerCapacity: {
    anthropic: { used: 0, max: 5 },
    openai: { used: 0, max: 3 },
    ollama: { used: 0, max: 2 },
  },
  queueDepth: 0,
}

class OrchestratorRuntime {
  private state: OrchestratorState = {
    activeSessions: [],
    dependencies: [],
    runtimeQueue: [],
    runtimeLoad: { ...defaultRuntimeLoad },
    reviewSessions: [],
    timeline: [],
    runtimePlans: [],
    reasoning: [],
    blockers: [],
  }

  private listeners = new Set<OrchestratorListener>()
  private initPromise: Promise<void> | null = null
  private activeProjectId: string | null = null

  private refreshTimer: ReturnType<typeof setTimeout> | null = null

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise
    this.initPromise = this.doInit()
    return this.initPromise
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer)
    this.refreshTimer = setTimeout(() => {
      void this.refreshFromStore()
    }, 100)
  }

  private async doInit(): Promise<void> {
    await taskGraphEngine.init()
    taskGraphEngine.subscribe(() => {
      this.scheduleRefresh()
    })
    await this.hydrateFromStore()
  }

  async refreshFromStore(): Promise<void> {
    await this.hydrateFromStore()
  }

  private async hydrateFromStore(): Promise<void> {
    const store = getLocalStore()
    if (!store.available) return

    try {
      const projects = await store.listProjects()
      this.activeProjectId = localStorage.getItem('agentos.activeProjectId') ?? projects[0]?.id ?? null

      const events = await store.listEvents({
        projectId: this.activeProjectId,
        limit: 500,
      })

      const timeline = events.length > 0
        ? events
            .map(storedEventToOrchestrator)
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        : []

      const graphState = taskGraphEngine.getState()
      const project = graphState.activeProject
      const nodes = graphState.nodes
      const edges = graphState.edges

      if (project && nodes.length > 0) {
        const activeSessions = graphToActiveSessions(nodes, project)
        const dependencies = graphToSessionDependencies(nodes, edges)
        const reviewSessions = graphToReviewSessions(nodes)
        const readyIds = graphState.readyNodeIds
        const runningCount = activeSessions.filter(
          s => s.status === 'running' || s.status === 'reviewing' || s.status === 'planning',
        ).length

        this.patch({
          timeline,
          activeSessions,
          dependencies,
          reviewSessions,
          runtimeQueue: readyIds.map((nodeId, index) => {
            const n = nodes.find(node => node.id === nodeId)
            const meta = (n?.metadata ?? {}) as Record<string, unknown>
            return {
              id: `rq-${nodeId}`,
              taskTitle: n?.title ?? 'Ready task',
              workspaceName: project.title,
              agentName: (meta.assignedAgentName as string) ?? 'Builder',
              queuedAt: new Date().toISOString(),
              waitingFor: 'dependency' as const,
              estimatedWaitSeconds: index * 30,
              priority: index === 0 ? 'high' as const : 'normal' as const,
            }
          }),
          runtimeLoad: {
            ...defaultRuntimeLoad,
            activeSessions: activeSessions.length,
            cpuPercent: runningCount > 0 ? Math.min(40 + runningCount * 12, 85) : 0,
            queueDepth: activeSessions.filter(s => s.status === 'queued').length,
            providerCapacity: {
              ...defaultRuntimeLoad.providerCapacity,
              anthropic: {
                used: Math.min(runningCount, defaultRuntimeLoad.providerCapacity.anthropic?.max ?? 5),
                max: defaultRuntimeLoad.providerCapacity.anthropic?.max ?? 5,
              },
            },
          },
        })
      } else {
        this.patch({
          timeline,
          activeSessions: [],
          dependencies: [],
          reviewSessions: [],
          runtimeQueue: [],
          runtimeLoad: { ...defaultRuntimeLoad },
        })
      }
    } catch {
      // keep prior state on failure
    }
  }

  getState(): OrchestratorState {
    return this.state
  }

  subscribe(fn: OrchestratorListener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private patch(updates: Partial<OrchestratorState>): void {
    this.state = { ...this.state, ...updates }
    this.listeners.forEach(fn => fn(this.state))
  }

  private pushEvent(ev: Omit<OrchestratorEvent, 'id' | 'timestamp'>): void {
    const entry: OrchestratorEvent = { id: uid(), timestamp: ts(), ...ev }
    this.patch({ timeline: [entry, ...this.state.timeline] })

    const store = getLocalStore()
    if (store.available) {
      const input = orchestratorEventToAppendInput(ev, this.activeProjectId)
      store.appendEvent(input).catch(() => {})
    }
  }

  escalateBlocker(id: string): void {
    this.patch({
      blockers: this.state.blockers.map(b =>
        b.id === id ? { ...b, escalatedToHuman: true } : b
      ),
    })
    const blocker = this.state.blockers.find(b => b.id === id)
    if (blocker) {
      this.pushReasoning({
        decisionType: 'escalation',
        affectedSessionId: blocker.sessionId,
        explanation: 'Blocker escalated to human — automatic resolution not possible. Awaiting manual intervention.',
        severity: 'critical',
      })
      this.pushEvent({
        type: 'escalated',
        message: 'Blocker escalated to human supervisor',
        severity: 'warning',
      })
    }
  }

  overrideAssignment(sessionId: string, field: string, value: string): void {
    this.pushReasoning({
      decisionType: 'human_override',
      affectedSessionId: sessionId,
      explanation: `Human overrode ${field} → ${value} for session ${sessionId}.`,
      severity: 'info',
    })
    this.pushEvent({
      type: 'session_started',
      sessionId,
      message: `Human override: ${field} changed to ${value}`,
      severity: 'info',
    })
  }

  private pushReasoning(entry: Omit<RuntimeReasoning, 'id' | 'timestamp'>): void {
    const record: RuntimeReasoning = {
      id: `rr-live-${Date.now()}`,
      timestamp: ts(),
      ...entry,
    }
    this.patch({ reasoning: [record, ...this.state.reasoning].slice(0, 40) })
  }
}

export const orchestratorRuntime = new OrchestratorRuntime()
