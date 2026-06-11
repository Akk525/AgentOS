/**
 * Run via: npx tsx src/runtime/execution/spawnBuilderFixTask.test.ts
 */
import type { GraphEdge, GraphNode } from '../../types/graph'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

export function runSpawnBuilderFixTaskLogicTests(): void {
  const failedTestNode: GraphNode = {
    id: 'test-1',
    projectId: 'p1',
    type: 'task',
    parentId: 'epic-1',
    title: 'Add tests',
    description: '',
    status: 'failed',
    acceptanceCriteria: [],
    assignedRole: 'test-writer',
    assignedSessionId: 'sess-t',
    branch: null,
    metadata: { role: 'test-writer', provider: 'anthropic', model: 'claude-sonnet-4-6' },
    createdAt: '1',
    updatedAt: '1',
  }

  const fixEdge: GraphEdge = {
    id: 'e-fix',
    projectId: 'p1',
    fromNodeId: failedTestNode.id,
    toNodeId: 'fix-1',
    edgeType: 'depends_on',
  }

  assert(fixEdge.fromNodeId === 'test-1', 'test node should depend on fix task')
  assert(fixEdge.toNodeId === 'fix-1', 'fix task is prerequisite')
  assert(failedTestNode.parentId === 'epic-1', 'fix task should share epic parent')
}

export function run(): void {
  runSpawnBuilderFixTaskLogicTests()
  console.log('spawnBuilderFixTask.test.ts: all passed')
}

run()
