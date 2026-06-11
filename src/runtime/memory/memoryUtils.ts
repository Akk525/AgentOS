import type { GraphNode } from '../../types/graph'
import { taskGraphEngine } from '../taskGraphEngine'

export function inferTagsFromTitle(title: string): string[] {
  return title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w.length > 3)
    .slice(0, 5)
}

export function resolveEpicId(nodeId: string | undefined, nodes: GraphNode[]): string | undefined {
  if (!nodeId) return undefined
  const node = nodes.find(n => n.id === nodeId)
  if (!node) return undefined
  if (node.type === 'epic') return node.id
  return node.parentId ?? undefined
}

export function getEpicTitle(epicId: string | undefined, nodes: GraphNode[]): string | undefined {
  if (!epicId) return undefined
  return nodes.find(n => n.id === epicId)?.title
}

export function contentHash(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    hash = (hash << 5) - hash + content.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

export function getActiveNodes(): GraphNode[] {
  return taskGraphEngine.getState().nodes
}
