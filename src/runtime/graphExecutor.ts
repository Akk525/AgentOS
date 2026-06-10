import type { GraphEdge, GraphNode } from '../types/graph'

const READY_STATUSES = new Set<GraphNode['status']>(['pending', 'assigned'])

function prerequisites(nodeId: string, edges: GraphEdge[]): string[] {
  return edges
    .filter(e => e.fromNodeId === nodeId && e.edgeType === 'depends_on')
    .map(e => e.toNodeId)
}

function isDone(nodeId: string, nodes: GraphNode[]): boolean {
  return nodes.find(n => n.id === nodeId)?.status === 'done'
}

function taskNodes(nodes: GraphNode[]): GraphNode[] {
  return nodes.filter(n => n.type === 'task')
}

export function computeReadyNodes(nodes: GraphNode[], edges: GraphEdge[]): string[] {
  return taskNodes(nodes)
    .filter(n => {
      if (!READY_STATUSES.has(n.status)) return false
      const prereqs = prerequisites(n.id, edges)
      return prereqs.every(p => isDone(p, nodes))
    })
    .map(n => n.id)
}

export function computeBlockedNodes(nodes: GraphNode[], edges: GraphEdge[]): string[] {
  return taskNodes(nodes)
    .filter(n => {
      if (n.status === 'done' || n.status === 'failed') return false
      const prereqs = prerequisites(n.id, edges)
      return prereqs.some(p => !isDone(p, nodes))
    })
    .map(n => n.id)
}
