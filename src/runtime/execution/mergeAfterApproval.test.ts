/**
 * Run via: npx tsx src/runtime/execution/mergeAfterApproval.test.ts
 */
import type { GraphEdge, GraphNode } from '../../types/graph'
import { findUpstreamNodeByRole } from '../graphWorktree'

const reviewer: GraphNode = {
  id: 'review-1',
  projectId: 'p1',
  type: 'task',
  parentId: 'epic-1',
  title: 'Review',
  description: '',
  status: 'review',
  acceptanceCriteria: [],
  assignedRole: 'reviewer',
  assignedSessionId: 'sess-r',
  branch: null,
  metadata: { role: 'reviewer' },
  createdAt: '1',
  updatedAt: '1',
}

const builder: GraphNode = {
  id: 'builder-1',
  projectId: 'p1',
  type: 'task',
  parentId: 'epic-1',
  title: 'Build',
  description: '',
  status: 'done',
  acceptanceCriteria: [],
  assignedRole: 'builder',
  assignedSessionId: 'sess-b',
  branch: 'agentos/task-builder',
  metadata: {
    role: 'builder',
    worktree: '/repo/.agentos/worktrees/task-builder',
  },
  createdAt: '1',
  updatedAt: '1',
}

const edges: GraphEdge[] = [
  { id: 'e1', projectId: 'p1', fromNodeId: 'review-1', toNodeId: 'builder-1', edgeType: 'depends_on' },
]

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

export function runMergeAfterApprovalLogicTests(): void {
  const upstream = findUpstreamNodeByRole(reviewer, [builder, reviewer], edges, 'builder')
  assert(upstream?.id === 'builder-1', 'reviewer should resolve builder for merge')
  assert(upstream?.branch === 'agentos/task-builder', 'builder branch available for merge')
  assert(
    (upstream?.metadata.worktree as string).includes('worktrees'),
    'worktree path present for cleanup',
  )
}

export function run(): void {
  runMergeAfterApprovalLogicTests()
  console.log('mergeAfterApproval.test.ts: all passed')
}

run()
