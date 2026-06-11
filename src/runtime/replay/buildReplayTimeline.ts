import type { GraphEdge, GraphNode } from '../../types/graph'
import type { TraceEvent } from '../../types'
import { getSessionData } from '../sessionStore'
import { getLocalStore } from '../store'
import type { ReplayScope, ReplayStep } from './replayTypes'

const PATCH_TYPES = new Set(['patch_updated'])
const TRACE_PATCH_TYPES = new Set(['patch_updated'])

function storedToStep(ev: {
  id: string
  timestamp: string
  type: string
  message: string
  nodeId: string | null
  sessionId: string | null
  severity: string
  payload: Record<string, unknown>
}): ReplayStep {
  return {
    id: ev.id,
    timestamp: ev.timestamp,
    source: 'stored',
    type: ev.type,
    message: ev.message,
    nodeId: ev.nodeId ?? undefined,
    sessionId: ev.sessionId ?? undefined,
    severity: ev.severity as ReplayStep['severity'],
    payload: ev.payload,
  }
}

function traceToStep(te: TraceEvent, nodeId: string, sessionId?: string): ReplayStep {
  return {
    id: te.id,
    timestamp: te.timestamp,
    source: 'trace',
    type: te.type,
    message: te.label,
    nodeId,
    sessionId,
    severity: te.success === false ? 'error' : 'info',
    payload: {
      actor: te.actor,
      detail: te.detail,
      durationMs: te.durationMs,
      tokenCount: te.tokenCount,
    },
  }
}

function collectScopeNodeIds(
  scope: ReplayScope,
  nodes: GraphNode[],
): Set<string> | null {
  if (scope.nodeId) return new Set([scope.nodeId])
  if (!scope.epicId) return null

  const ids = new Set<string>([scope.epicId])
  for (const n of nodes) {
    if (n.parentId === scope.epicId) ids.add(n.id)
  }
  return ids
}

function eventMatchesScope(
  ev: { nodeId: string | null; type: string },
  scopeNodeIds: Set<string> | null,
): boolean {
  if (!scopeNodeIds) return true
  if (!ev.nodeId) return ev.type === 'plan_created'
  return scopeNodeIds.has(ev.nodeId)
}

function isDuplicatePatch(stored: ReplayStep, trace: ReplayStep): boolean {
  if (!PATCH_TYPES.has(stored.type) || !TRACE_PATCH_TYPES.has(trace.type)) return false
  if (stored.nodeId !== trace.nodeId) return false
  const delta = Math.abs(new Date(stored.timestamp).getTime() - new Date(trace.timestamp).getTime())
  return delta < 5000
}

export async function buildReplayTimeline(
  scope: ReplayScope,
  nodes: GraphNode[] = [],
  _edges: GraphEdge[] = [],
): Promise<ReplayStep[]> {
  const store = getLocalStore()
  const scopeNodeIds = collectScopeNodeIds(scope, nodes)

  const storedEvents = await store.listEvents({
    projectId: scope.projectId,
    nodeId: scope.nodeId,
    sessionId: scope.sessionId,
    order: 'asc',
    limit: 1000,
  })

  const filteredStored = storedEvents.filter(ev => eventMatchesScope(ev, scopeNodeIds))
  const steps: ReplayStep[] = filteredStored.map(storedToStep)

  const nodeIdsForTraces = new Set<string>()
  if (scope.nodeId) {
    nodeIdsForTraces.add(scope.nodeId)
  } else if (scopeNodeIds) {
    for (const id of scopeNodeIds) {
      const node = nodes.find(n => n.id === id)
      if (node?.type === 'task') nodeIdsForTraces.add(id)
    }
  } else {
    for (const ev of filteredStored) {
      if (ev.nodeId) nodeIdsForTraces.add(ev.nodeId)
    }
  }

  for (const nodeId of nodeIdsForTraces) {
    const session = await getSessionData(scope.projectId, nodeId)
    if (!session?.events.length) continue
    const node = nodes.find(n => n.id === nodeId)
    const sessionId = node?.assignedSessionId ?? undefined
    for (const te of session.events) {
      steps.push(traceToStep(te, nodeId, sessionId))
    }
  }

  steps.sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  const deduped: ReplayStep[] = []
  for (const step of steps) {
    const prev = deduped[deduped.length - 1]
    if (prev && step.source === 'trace' && prev.source === 'stored' && isDuplicatePatch(prev, step)) {
      continue
    }
    deduped.push(step)
  }

  return deduped
}

export async function loadAllProjectEvents(projectId: string): Promise<ReplayStep[]> {
  const store = getLocalStore()
  const all: ReplayStep[] = []
  let offset = 0
  const pageSize = 500

  while (true) {
    const page = await store.listEvents({
      projectId,
      order: 'asc',
      limit: pageSize,
      offset,
    })
    if (page.length === 0) break
    all.push(...page.map(storedToStep))
    if (page.length < pageSize) break
    offset += pageSize
  }

  return all
}
