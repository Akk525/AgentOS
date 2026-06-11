import type { SessionData } from '../types'
import { getLocalStore } from './store'
import { storedSessionToSessionData } from './sessionProjection'

export function emptySessionData(taskId: string): SessionData {
  return {
    taskId,
    events: [],
    toolCalls: [],
    testResults: [],
    diff: [],
    terminalOutput: [],
  }
}

export async function ensureTaskSessionShells(
  projectId: string,
  nodeIds: string[],
): Promise<void> {
  const store = getLocalStore()
  if (!store.available || nodeIds.length === 0) return

  const existing = await store.listSessions(projectId)
  const existingNodeIds = new Set(
    existing.map(s => s.nodeId).filter((id): id is string => !!id),
  )

  for (const nodeId of nodeIds) {
    if (existingNodeIds.has(nodeId)) continue
    await store.upsertSession({
      projectId,
      nodeId,
      data: { ...emptySessionData(nodeId) },
    })
  }
}

export async function updateSessionData(
  projectId: string,
  nodeId: string,
  partial: Partial<SessionData>,
): Promise<SessionData> {
  const store = getLocalStore()
  const sessions = await store.listSessions(projectId)
  const existing = sessions.find(s => s.nodeId === nodeId)
  const base = existing
    ? storedSessionToSessionData(existing, nodeId)
    : emptySessionData(nodeId)

  const merged: SessionData = {
    ...base,
    ...partial,
    taskId: nodeId,
    events: partial.events ? [...base.events, ...partial.events] : base.events,
    toolCalls: partial.toolCalls ? [...base.toolCalls, ...partial.toolCalls] : base.toolCalls,
    testResults: partial.testResults ?? base.testResults,
    diff: partial.diff ?? base.diff,
    terminalOutput: partial.terminalOutput
      ? [...base.terminalOutput, ...partial.terminalOutput]
      : base.terminalOutput,
    completionNote: partial.completionNote ?? base.completionNote,
    totalTokens: partial.totalTokens ?? base.totalTokens,
    totalCostUsd: partial.totalCostUsd ?? base.totalCostUsd,
  }

  await store.upsertSession({
    id: existing?.id,
    projectId,
    nodeId,
    data: { ...merged },
  })

  return merged
}

export async function getSessionData(
  projectId: string,
  nodeId: string,
): Promise<SessionData | null> {
  const store = getLocalStore()
  const sessions = await store.listSessions(projectId)
  const existing = sessions.find(s => s.nodeId === nodeId)
  if (!existing) return null
  return storedSessionToSessionData(existing, nodeId)
}
