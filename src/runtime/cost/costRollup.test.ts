/**
 * Run via: npx tsx src/runtime/cost/costRollup.test.ts
 */
import type { GraphNode } from '../../types/graph'
import { rollupEpic, rollupProject, rollupTask } from './costRollup'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

const nodes: GraphNode[] = [
  {
    id: 'epic-1',
    projectId: 'p1',
    type: 'epic',
    parentId: null,
    title: 'Epic',
    description: '',
    status: 'running',
    acceptanceCriteria: [],
    assignedRole: null,
    assignedSessionId: null,
    branch: null,
    metadata: { tokensUsed: 300, costUsd: 0.01 },
    createdAt: '1',
    updatedAt: '1',
  },
  {
    id: 'task-1',
    projectId: 'p1',
    type: 'task',
    parentId: 'epic-1',
    title: 'Build',
    description: '',
    status: 'done',
    acceptanceCriteria: [],
    assignedRole: 'builder',
    assignedSessionId: null,
    branch: null,
    metadata: { tokensUsed: 1000, costUsd: 0.05 },
    createdAt: '1',
    updatedAt: '1',
  },
  {
    id: 'task-2',
    projectId: 'p1',
    type: 'task',
    parentId: 'epic-1',
    title: 'Review',
    description: '',
    status: 'review',
    acceptanceCriteria: [],
    assignedRole: 'reviewer',
    assignedSessionId: null,
    branch: null,
    metadata: { tokensUsed: 500, costUsd: 0.02 },
    createdAt: '1',
    updatedAt: '1',
  },
]

function run(): void {
  const task = rollupTask('task-1', nodes)
  assert(task.tokensUsed === 1000, 'task rollup tokens')
  assert(task.costUsd === 0.05, 'task rollup cost')

  const epic = rollupEpic('epic-1', nodes)
  assert(epic.tokensUsed === 1800, `epic rollup tokens, got ${epic.tokensUsed}`)
  assert(Math.abs(epic.costUsd - 0.08) < 0.0001, `epic rollup cost, got ${epic.costUsd}`)

  const project = rollupProject('p1', nodes)
  assert(project.tokensUsed === 1800, 'project rollup tokens')
  assert(Math.abs(project.costUsd - 0.08) < 0.0001, 'project rollup cost')

  console.log('costRollup.test.ts: all passed')
}

run()
