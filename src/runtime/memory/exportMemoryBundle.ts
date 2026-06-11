import type { MemoryBundle } from './memoryTypes'
import { getLocalStore } from '../store'

export async function exportMemoryBundle(projectId: string): Promise<MemoryBundle> {
  const store = getLocalStore()
  const graph = await store.getProject(projectId)
  if (!graph) {
    throw new Error(`Project not found: ${projectId}`)
  }

  const memories = await store.listMemories({ projectId, limit: 5000 })
  const events = await store.listEvents({ projectId, order: 'asc', limit: 5000 })
  const memoryEvents = events.filter(
    e => e.type === 'memory_recorded' || e.type === 'fetch_context',
  )

  const epicIds = graph.nodes.filter(n => n.type === 'epic').map(n => n.id)

  return {
    project: { ...graph.project },
    memories: memories.map(m => ({ ...m })),
    events: memoryEvents.map(e => ({ ...e })),
    epicIds,
  }
}
