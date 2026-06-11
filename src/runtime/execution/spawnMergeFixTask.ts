import type { GraphEdge, GraphNode, Project } from '../../types/graph'
import { findUpstreamNodeByRole } from '../graphWorktree'
import { getLocalStore } from '../store'
import { ensureTaskSessionShells } from '../sessionStore'
import { taskGraphEngine } from '../taskGraphEngine'

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export interface SpawnMergeFixTaskInput {
  project: Project
  reviewerNode: GraphNode
  conflictSummary: string
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export async function spawnMergeFixTask(input: SpawnMergeFixTaskInput): Promise<GraphNode> {
  const { project, reviewerNode, conflictSummary, nodes, edges } = input
  const upstreamBuilder = findUpstreamNodeByRole(reviewerNode, nodes, edges, 'builder')
  const fixId = uid('task')
  const sessionId = uid('sess')

  const builderMeta = upstreamBuilder?.metadata as Record<string, unknown> | undefined
  const reviewerMeta = reviewerNode.metadata as Record<string, unknown>

  const fixNode = await taskGraphEngine.upsertNode({
    id: fixId,
    projectId: project.id,
    type: 'task',
    parentId: reviewerNode.parentId,
    title: `Resolve merge conflict: ${conflictSummary.slice(0, 60)}`,
    description: `Address merge conflict before re-approving review.\n\n${conflictSummary}`,
    status: 'pending',
    assignedRole: 'builder',
    acceptanceCriteria: ['Merge conflict resolved', 'Branch merges cleanly into main'],
    metadata: {
      role: 'builder',
      repo: (reviewerMeta.repo as string) ?? 'local/project',
      provider: (builderMeta?.provider as string) ?? (reviewerMeta.provider as string) ?? 'anthropic',
      model: (builderMeta?.model as string) ?? (reviewerMeta.model as string) ?? 'claude-sonnet-4-6',
      spawnedFromReviewerNodeId: reviewerNode.id,
      mergeConflictFix: true,
      assignedAgentName: 'Builder',
    },
  })

  await taskGraphEngine.upsertEdge({
    projectId: project.id,
    fromNodeId: reviewerNode.id,
    toNodeId: fixId,
    edgeType: 'depends_on',
  })

  await ensureTaskSessionShells(project.id, [fixId])

  await taskGraphEngine.transitionNode(
    reviewerNode.id,
    'pending',
    {
      mergeConflict: true,
      blockReason: 'Merge conflict — fix task spawned',
      lastMergeFixTaskId: fixId,
      mergeConflictSummary: conflictSummary,
    },
    { assignedSessionId: reviewerNode.assignedSessionId },
  )

  await getLocalStore().appendEvent({
    projectId: project.id,
    nodeId: fixId,
    sessionId,
    type: 'merge_conflict_fix_spawned',
    message: `Merge fix task spawned: ${conflictSummary.slice(0, 80)}`,
    severity: 'warning',
    payload: {
      agentName: 'Governance',
      reviewerNodeId: reviewerNode.id,
      fixTaskId: fixId,
      summary: conflictSummary,
    },
  })

  return fixNode
}
