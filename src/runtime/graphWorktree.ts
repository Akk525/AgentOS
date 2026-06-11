import type { GraphEdge, GraphNode } from '../types/graph'

export function getNodeRole(node: GraphNode): string {
  return node.assignedRole ?? (node.metadata.role as string | undefined) ?? 'general'
}

export function getDependencyNodeIds(nodeId: string, edges: GraphEdge[]): string[] {
  return edges
    .filter(e => e.fromNodeId === nodeId && e.edgeType === 'depends_on')
    .map(e => e.toNodeId)
}

export function getDependencyNodes(
  node: GraphNode,
  nodes: GraphNode[],
  edges: GraphEdge[],
): GraphNode[] {
  const ids = new Set(getDependencyNodeIds(node.id, edges))
  return nodes.filter(n => ids.has(n.id))
}

export function walkUpstreamNodes(
  startNode: GraphNode,
  nodes: GraphNode[],
  edges: GraphEdge[],
): GraphNode[] {
  const byId = new Map(nodes.map(n => [n.id, n]))
  const visited = new Set<string>()
  const queue = [...getDependencyNodeIds(startNode.id, edges)]
  const result: GraphNode[] = []

  while (queue.length > 0) {
    const id = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    const n = byId.get(id)
    if (!n) continue
    result.push(n)
    queue.push(...getDependencyNodeIds(id, edges))
  }

  return result
}

export function findUpstreamNodeByRole(
  startNode: GraphNode,
  nodes: GraphNode[],
  edges: GraphEdge[],
  role: string,
): GraphNode | undefined {
  return walkUpstreamNodes(startNode, nodes, edges).find(n => getNodeRole(n) === role)
}

export interface ResolvedWorktree {
  worktreePath: string
  branchName: string
  sourceNode: GraphNode
}

export function resolveUpstreamWorktree(
  node: GraphNode,
  nodes: GraphNode[],
  edges: GraphEdge[],
): ResolvedWorktree {
  const upstream = walkUpstreamNodes(node, nodes, edges)
  for (const upstreamNode of upstream) {
    const meta = upstreamNode.metadata as Record<string, unknown>
    const worktreePath = meta.worktree as string | undefined
    if (worktreePath) {
      return {
        worktreePath,
        branchName: upstreamNode.branch ?? 'main',
        sourceNode: upstreamNode,
      }
    }
  }

  throw new Error(
    `No upstream worktree found for "${node.title}". Ensure a builder task completed first.`,
  )
}
