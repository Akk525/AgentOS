import type { GraphNode, Project } from '../../types/graph'
import { getLocalStore } from '../store'
import { ensureTaskSessionShells } from '../sessionStore'
import { taskGraphEngine } from '../taskGraphEngine'

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export interface SpawnBuilderFixTaskInput {
  project: Project
  failedTestNode: GraphNode
  failureSummary: string
  upstreamBuilder?: GraphNode
}

export async function spawnBuilderFixTask(input: SpawnBuilderFixTaskInput): Promise<GraphNode> {
  const { project, failedTestNode, failureSummary, upstreamBuilder } = input
  const fixId = uid('task')
  const sessionId = uid('sess')

  const builderMeta = upstreamBuilder?.metadata as Record<string, unknown> | undefined
  const testMeta = failedTestNode.metadata as Record<string, unknown>

  const fixNode = await taskGraphEngine.upsertNode({
    id: fixId,
    projectId: project.id,
    type: 'task',
    parentId: failedTestNode.parentId,
    title: `Fix failing tests: ${failureSummary.slice(0, 80)}`,
    description: `Address test failures from "${failedTestNode.title}".\n\n${failureSummary}`,
    status: 'pending',
    assignedRole: 'builder',
    acceptanceCriteria: ['All previously failing tests pass'],
    metadata: {
      role: 'builder',
      repo: (testMeta.repo as string) ?? 'local/project',
      provider: (builderMeta?.provider as string) ?? (testMeta.provider as string) ?? 'anthropic',
      model: (builderMeta?.model as string) ?? (testMeta.model as string) ?? 'claude-sonnet-4-6',
      spawnedFromTestNodeId: failedTestNode.id,
      assignedAgentName: 'Builder',
    },
  })

  await taskGraphEngine.upsertEdge({
    projectId: project.id,
    fromNodeId: failedTestNode.id,
    toNodeId: fixId,
    edgeType: 'depends_on',
  })

  await ensureTaskSessionShells(project.id, [fixId])

  await taskGraphEngine.transitionNode(
    failedTestNode.id,
    'pending',
    {
      testStatus: 'failed',
      testFailureSummary: failureSummary,
      lastFixTaskId: fixId,
    },
    { assignedSessionId: failedTestNode.assignedSessionId },
  )

  await getLocalStore().appendEvent({
    projectId: project.id,
    nodeId: fixId,
    sessionId,
    type: 'test_failure_fix_spawned',
    message: `Fix task spawned for failed tests: ${failedTestNode.title}`,
    severity: 'warning',
    payload: {
      agentName: 'Test Writer',
      failedTestNodeId: failedTestNode.id,
      fixTaskId: fixId,
      summary: failureSummary,
    },
  })

  return fixNode
}
