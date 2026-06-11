/**
 * Run via: npx tsx src/runtime/graphWorktree.test.ts
 */
import type { GraphEdge, GraphNode } from '../types/graph'
import {
  findUpstreamNodeByRole,
  getDependencyNodeIds,
  resolveUpstreamWorktree,
} from './graphWorktree'

const builder: GraphNode = {
  id: 'builder-1',
  projectId: 'p1',
  type: 'task',
  parentId: 'epic-1',
  title: 'Implement',
  description: '',
  status: 'done',
  acceptanceCriteria: [],
  assignedRole: 'builder',
  assignedSessionId: 'sess-b',
  branch: 'agentos/task-builder',
  metadata: { worktree: '/repo/.agentos/worktrees/task-builder', role: 'builder' },
  createdAt: '1',
  updatedAt: '1',
}

const testWriter: GraphNode = {
  id: 'test-1',
  projectId: 'p1',
  type: 'task',
  parentId: 'epic-1',
  title: 'Add tests',
  description: '',
  status: 'pending',
  acceptanceCriteria: [],
  assignedRole: 'test-writer',
  assignedSessionId: null,
  branch: null,
  metadata: { role: 'test-writer' },
  createdAt: '1',
  updatedAt: '1',
}

const reviewer: GraphNode = {
  id: 'review-1',
  projectId: 'p1',
  type: 'task',
  parentId: 'epic-1',
  title: 'Review',
  description: '',
  status: 'pending',
  acceptanceCriteria: [],
  assignedRole: 'reviewer',
  assignedSessionId: null,
  branch: null,
  metadata: { role: 'reviewer' },
  createdAt: '1',
  updatedAt: '1',
}

const edges: GraphEdge[] = [
  { id: 'e1', projectId: 'p1', fromNodeId: 'test-1', toNodeId: 'builder-1', edgeType: 'depends_on' },
  { id: 'e2', projectId: 'p1', fromNodeId: 'review-1', toNodeId: 'test-1', edgeType: 'depends_on' },
]

const nodes = [builder, testWriter, reviewer]

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

export function runGraphWorktreeTests(): void {
  assert(
    getDependencyNodeIds('test-1', edges).includes('builder-1'),
    'test-writer should depend on builder',
  )

  const resolved = resolveUpstreamWorktree(testWriter, nodes, edges)
  assert(resolved.worktreePath.includes('task-builder'), 'should resolve builder worktree')
  assert(resolved.sourceNode.id === 'builder-1', 'source should be builder')

  const upstreamBuilder = findUpstreamNodeByRole(reviewer, nodes, edges, 'builder')
  assert(upstreamBuilder?.id === 'builder-1', 'reviewer should find upstream builder')

  const upstreamTest = findUpstreamNodeByRole(reviewer, nodes, edges, 'test-writer')
  assert(upstreamTest?.id === 'test-1', 'reviewer should find upstream test-writer')
}

export function run(): void {
  runGraphWorktreeTests()
  console.log('graphWorktree.test.ts: all passed')
}

run()
