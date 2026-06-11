import type { AgentMemory, GraphNode } from '../../types/graph'
import type { TraceEvent } from '../../types'
import { getLocalStore } from '../store'
import { updateSessionData } from '../sessionStore'
import { taskGraphEngine } from '../taskGraphEngine'
import { formatMemoryBlock } from './formatMemoryBlock'
import type { RecallOptions, RecallResult } from './memoryTypes'
import { setLastRecall } from './recallState'

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function buildDefaultQuery(node: GraphNode | undefined, role: string): string {
  if (!node) return role
  return [node.title, node.description, role].filter(Boolean).join(' ')
}

function rankMemories(
  memories: AgentMemory[],
  epicId: string | undefined,
  nodeId: string | undefined,
  nodes: GraphNode[],
): AgentMemory[] {
  const epicTaskIds = epicId
    ? new Set(nodes.filter(n => n.parentId === epicId).map(n => n.id))
    : null

  return [...memories]
    .filter(m => !nodeId || m.nodeId !== nodeId)
    .sort((a, b) => {
      const aEpicBoost = epicTaskIds && a.nodeId && epicTaskIds.has(a.nodeId) ? 1 : 0
      const bEpicBoost = epicTaskIds && b.nodeId && epicTaskIds.has(b.nodeId) ? 1 : 0
      if (aEpicBoost !== bEpicBoost) return bEpicBoost - aEpicBoost
      return b.createdAt.localeCompare(a.createdAt)
    })
}

async function emitFetchContextTrace(
  projectId: string,
  nodeId: string | undefined,
  sessionId: string | undefined,
  memories: RecallResult['memories'],
): Promise<void> {
  if (!nodeId || memories.length === 0) return

  const traceEvent: TraceEvent = {
    id: uid('te'),
    type: 'fetch_context',
    timestamp: new Date().toISOString(),
    label: `Recalled ${memories.length} memor${memories.length === 1 ? 'y' : 'ies'}`,
    actor: 'agent',
    detail: memories.map(m => m.content).join('\n'),
  }

  await updateSessionData(projectId, nodeId, { events: [traceEvent] })

  await getLocalStore().appendEvent({
    projectId,
    nodeId,
    sessionId,
    type: 'fetch_context',
    message: traceEvent.label,
    severity: 'info',
    payload: {
      memoryIds: memories.map(m => m.id),
      memoryCount: memories.length,
    },
  })
}

export async function recallContext(options: RecallOptions): Promise<RecallResult> {
  const store = getLocalStore()
  const { projectId, nodeId, agentRole, limit = 5, epicId, sessionId } = options
  const nodes = taskGraphEngine.getState().nodes
  const node = nodeId ? nodes.find(n => n.id === nodeId) : undefined
  const query = options.query ?? buildDefaultQuery(node, agentRole)

  const raw = await store.searchMemories({ projectId, query, limit: limit * 2 })
  const ranked = rankMemories(raw, epicId, nodeId, nodes).slice(0, limit)
  const formattedBlock = formatMemoryBlock(ranked)

  if (nodeId) {
    setLastRecall(nodeId, ranked.length)
  }

  if (ranked.length > 0) {
    await emitFetchContextTrace(projectId, nodeId, sessionId, ranked)
  }

  return { memories: ranked, formattedBlock }
}
