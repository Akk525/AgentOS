/**
 * Run via: npx tsx src/runtime/replay/provenanceChain.test.ts
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

import { taskGraphEngine } from '../taskGraphEngine'
import { buildProvenanceChain } from './provenanceChain'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

async function run(): Promise<void> {
  await taskGraphEngine.init()

  const project = await taskGraphEngine.createProject({
    title: 'Prov test',
    goalText: 'chain ordering',
    governanceMode: 'assisted',
  })

  const epic = await taskGraphEngine.upsertNode({
    projectId: project.id,
    type: 'epic',
    title: 'Feature',
  })

  const taskA = await taskGraphEngine.upsertNode({
    projectId: project.id,
    type: 'task',
    parentId: epic.id,
    title: 'Task A',
    assignedRole: 'builder',
  })

  const taskB = await taskGraphEngine.upsertNode({
    projectId: project.id,
    type: 'task',
    parentId: epic.id,
    title: 'Task B',
    assignedRole: 'reviewer',
  })

  await taskGraphEngine.upsertEdge({
    projectId: project.id,
    fromNodeId: taskB.id,
    toNodeId: taskA.id,
    edgeType: 'depends_on',
  })

  const nodes = taskGraphEngine.getState().nodes
  const edges = taskGraphEngine.getState().edges

  const chain = await buildProvenanceChain(
    project,
    nodes,
    edges,
    { projectId: project.id, epicId: epic.id },
  )

  assert(chain.epic?.title === 'Feature', 'epic in chain')
  assert(chain.tasks.length === 2, 'two tasks')
  assert(chain.tasks[0].title === 'Task A', 'task A before B in topo order')
  assert(chain.tasks[1].title === 'Task B', 'task B after A')

  console.log('provenanceChain.test.ts: all passed')
}

run().catch(err => {
  console.error(err)
  throw err
})
