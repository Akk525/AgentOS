import type { GraphNode } from '../../types/graph'
import { getLocalStore } from '../store'
import { taskGraphEngine } from '../taskGraphEngine'

export interface CostTotals {
  tokensUsed: number
  costUsd: number
}

function nodeTotals(node: GraphNode): CostTotals {
  const meta = node.metadata as Record<string, unknown>
  return {
    tokensUsed: (meta.tokensUsed as number) ?? 0,
    costUsd: (meta.costUsd as number) ?? 0,
  }
}

function sumTotals(items: CostTotals[]): CostTotals {
  return items.reduce(
    (acc, t) => ({
      tokensUsed: acc.tokensUsed + t.tokensUsed,
      costUsd: acc.costUsd + t.costUsd,
    }),
    { tokensUsed: 0, costUsd: 0 },
  )
}

export function rollupTask(nodeId: string, nodes?: GraphNode[]): CostTotals {
  const list = nodes ?? taskGraphEngine.getState().nodes
  const node = list.find(n => n.id === nodeId)
  if (!node) return { tokensUsed: 0, costUsd: 0 }
  return nodeTotals(node)
}

export function rollupEpic(epicId: string, nodes?: GraphNode[]): CostTotals {
  const list = nodes ?? taskGraphEngine.getState().nodes
  const epic = list.find(n => n.id === epicId)
  if (!epic) return { tokensUsed: 0, costUsd: 0 }

  const children = list.filter(n => n.parentId === epicId)
  return sumTotals([nodeTotals(epic), ...children.map(nodeTotals)])
}

export function rollupProject(projectId: string, nodes?: GraphNode[]): CostTotals {
  const list = nodes ?? taskGraphEngine.getState().nodes
  const projectNodes = list.filter(n => n.projectId === projectId)
  return sumTotals(projectNodes.map(nodeTotals))
}

export async function rollupProjectFromStore(projectId: string): Promise<CostTotals> {
  const graph = await getLocalStore().getProject(projectId)
  if (!graph) return { tokensUsed: 0, costUsd: 0 }
  return rollupProject(projectId, graph.nodes)
}

export function formatCostUsd(costUsd: number): string {
  if (costUsd === 0) return '$0.00'
  if (costUsd < 0.01) return `$${costUsd.toFixed(4)}`
  return `$${costUsd.toFixed(2)}`
}
