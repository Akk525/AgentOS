import type { GraphNode, Project } from '../../types/graph'
import { findUpstreamNodeByRole } from '../graphWorktree'
import { getLocalStore } from '../store'
import { ensureTaskSessionShells } from '../sessionStore'
import { taskGraphEngine } from '../taskGraphEngine'
import type { GraphEdge } from '../../types/graph'

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export interface SpawnReviewFixTaskInput {
  project: Project
  reviewerNode: GraphNode
  changeNote: string
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export async function spawnReviewFixTask(input: SpawnReviewFixTaskInput): Promise<GraphNode> {
  const { project, reviewerNode, changeNote, nodes, edges } = input
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
    title: `Address review feedback: ${changeNote.slice(0, 60)}`,
    description: changeNote,
    status: 'pending',
    assignedRole: 'builder',
    acceptanceCriteria: ['Review feedback addressed'],
    metadata: {
      role: 'builder',
      repo: (reviewerMeta.repo as string) ?? 'local/project',
      provider: (builderMeta?.provider as string) ?? (reviewerMeta.provider as string) ?? 'anthropic',
      model: (builderMeta?.model as string) ?? (reviewerMeta.model as string) ?? 'claude-sonnet-4-6',
      spawnedFromReviewerNodeId: reviewerNode.id,
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
      reviewChangesRequested: changeNote,
      lastFixTaskId: fixId,
    },
    { assignedSessionId: reviewerNode.assignedSessionId },
  )

  await getLocalStore().appendEvent({
    projectId: project.id,
    nodeId: fixId,
    sessionId,
    type: 'review_comment',
    message: `Review fix task spawned: ${changeNote.slice(0, 80)}`,
    severity: 'info',
    payload: {
      agentName: 'Reviewer',
      reviewerNodeId: reviewerNode.id,
      fixTaskId: fixId,
    },
  })

  return fixNode
}
