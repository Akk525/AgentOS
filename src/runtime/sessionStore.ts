import type { SessionData } from '../types'
import { getLocalStore } from './store'

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
