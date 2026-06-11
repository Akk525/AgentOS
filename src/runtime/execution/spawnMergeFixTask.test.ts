/**
 * Run via: npx tsx src/runtime/execution/spawnMergeFixTask.test.ts
 */
const ls = new Map<string, string>()
;(globalThis as { localStorage?: Storage }).localStorage = {
  get length() {
    return ls.size
  },
  clear: () => ls.clear(),
  getItem: key => ls.get(key) ?? null,
  key: index => [...ls.keys()][index] ?? null,
  removeItem: key => ls.delete(key),
  setItem: (key, value) => ls.set(key, value),
}

import { getLocalStore } from '../store'
import { taskGraphEngine } from '../taskGraphEngine'
import { spawnMergeFixTask } from './spawnMergeFixTask'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

async function run(): Promise<void> {
  const store = getLocalStore()
  await store.init()
  await taskGraphEngine.init()

  const project = await taskGraphEngine.createProject({
    title: 'Merge fix test',
    goalText: 'test merge conflict spawn',
    governanceMode: 'assisted',
  })

  const epic = await taskGraphEngine.upsertNode({
    projectId: project.id,
    type: 'epic',
    title: 'Epic',
  })

  const builder = await taskGraphEngine.upsertNode({
    projectId: project.id,
    type: 'task',
    parentId: epic.id,
    title: 'Build',
    assignedRole: 'builder',
    metadata: { role: 'builder', provider: 'anthropic', model: 'claude-sonnet-4-6' },
  })

  const reviewer = await taskGraphEngine.upsertNode({
    projectId: project.id,
    type: 'task',
    parentId: epic.id,
    title: 'Review',
    status: 'review',
    assignedRole: 'reviewer',
    metadata: { role: 'reviewer' },
  })

  await taskGraphEngine.upsertEdge({
    projectId: project.id,
    fromNodeId: reviewer.id,
    toNodeId: builder.id,
    edgeType: 'depends_on',
  })

  const fixNode = await spawnMergeFixTask({
    project,
    reviewerNode: reviewer,
    conflictSummary: 'CONFLICT in src/app.ts',
    nodes: taskGraphEngine.getState().nodes,
    edges: taskGraphEngine.getState().edges,
  })

  assert(fixNode.assignedRole === 'builder', 'fix task is builder role')
  assert(fixNode.status === 'pending', 'fix task starts pending')

  const updatedReviewer = taskGraphEngine.getState().nodes.find(n => n.id === reviewer.id)
  assert(updatedReviewer?.status === 'pending', 'reviewer reset to pending')
  assert(updatedReviewer?.metadata.lastMergeFixTaskId === fixNode.id, 'reviewer links fix task')

  const events = await store.listEvents({ projectId: project.id })
  assert(
    events.some(e => e.type === 'merge_conflict_fix_spawned'),
    'merge_conflict_fix_spawned event recorded',
  )

  console.log('spawnMergeFixTask.test.ts: all passed')
}

run().catch(err => {
  console.error(err)
  throw err
})
