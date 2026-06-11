import type { GraphNode } from '../../types/graph'
import type { DiffFile, TraceEvent } from '../../types'
import { getSessionData } from '../sessionStore'
import type { ReplaySnapshot, ReplayStep } from './replayTypes'

const DIFF_EVENT_TYPES = new Set(['patch_updated', 'review_assigned'])

export class ReplayController {
  private steps: ReplayStep[] = []
  private index = 0
  private nodes: GraphNode[] = []
  private sessionCache = new Map<string, Awaited<ReturnType<typeof getSessionData>>>()

  async load(
    projectId: string,
    steps: ReplayStep[],
    nodes: GraphNode[] = [],
  ): Promise<void> {
    this.steps = steps
    this.nodes = nodes
    this.index = 0
    this.sessionCache.clear()

    const nodeIds = new Set(steps.map(s => s.nodeId).filter((id): id is string => !!id))
    for (const nodeId of nodeIds) {
      const session = await getSessionData(projectId, nodeId)
      if (session) this.sessionCache.set(nodeId, session)
    }
  }

  get totalSteps(): number {
    return this.steps.length
  }

  get currentIndex(): number {
    return this.index
  }

  get current(): ReplayStep | null {
    return this.steps[this.index] ?? null
  }

  get stepsList(): ReplayStep[] {
    return this.steps
  }

  seek(index: number): ReplaySnapshot | null {
    if (this.steps.length === 0) return null
    this.index = Math.max(0, Math.min(index, this.steps.length - 1))
    return this.buildSnapshot(this.index)
  }

  stepForward(): ReplaySnapshot | null {
    if (this.index >= this.steps.length - 1) return null
    this.index += 1
    return this.buildSnapshot(this.index)
  }

  stepBack(): ReplaySnapshot | null {
    if (this.index <= 0) return null
    this.index -= 1
    return this.buildSnapshot(this.index)
  }

  private buildSnapshot(stepIndex: number): ReplaySnapshot | null {
    const step = this.steps[stepIndex]
    if (!step) return null

    let cumulativeTokens = 0
    let cumulativeCostUsd = 0
    let lastDiff: DiffFile[] | undefined
    let lastTerminal: string[] | undefined
    const traceSlice: TraceEvent[] = []

    for (let i = 0; i <= stepIndex; i++) {
      const s = this.steps[i]
      const payload = s.payload ?? {}

      if (s.type === 'usage_recorded') {
        cumulativeTokens = (payload.cumulativeTokens as number) ?? cumulativeTokens
        cumulativeCostUsd = (payload.cumulativeCostUsd as number) ?? cumulativeCostUsd
      } else if (payload.totalTokens) {
        cumulativeTokens += payload.totalTokens as number
      }
      if (payload.costUsd) {
        cumulativeCostUsd += payload.costUsd as number
      }

      if (s.source === 'trace') {
        traceSlice.push({
          id: s.id,
          type: s.type as TraceEvent['type'],
          timestamp: s.timestamp,
          label: s.message,
          actor: (payload.actor as TraceEvent['actor']) ?? 'agent',
          detail: payload.detail as string | undefined,
          durationMs: payload.durationMs as number | undefined,
          success: s.severity !== 'error',
          tokenCount: payload.tokenCount as number | undefined,
        })
      }

      if (s.nodeId && DIFF_EVENT_TYPES.has(s.type)) {
        const session = this.sessionCache.get(s.nodeId)
        if (session?.diff.length) lastDiff = session.diff
        if (session?.terminalOutput.length) lastTerminal = session.terminalOutput
      }
    }

    const node = step.nodeId ? this.nodes.find(n => n.id === step.nodeId) : undefined
    const meta = (node?.metadata ?? {}) as Record<string, unknown>

    return {
      stepIndex,
      step,
      nodeTitle: node?.title,
      nodeStatus: node?.status,
      tokensUsed: (meta.tokensUsed as number) ?? cumulativeTokens,
      costUsd: (meta.costUsd as number) ?? cumulativeCostUsd,
      diff: lastDiff,
      terminalTail: lastTerminal?.slice(-12),
      traceEvents: traceSlice.length > 0 ? traceSlice : undefined,
      cumulativeTokens,
      cumulativeCostUsd,
    }
  }
}

export const replayController = new ReplayController()
