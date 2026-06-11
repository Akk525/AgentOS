/**
 * Run via: npx tsx src/runtime/memory/recallContext.test.ts
 */
const ls = new Map<string, string>()
;(globalThis as { localStorage?: Storage }).localStorage = {
  get length() { return ls.size },
  clear: () => ls.clear(),
  getItem: key => ls.get(key) ?? null,
  key: index => [...ls.keys()][index] ?? null,
  removeItem: key => ls.delete(key),
  setItem: (key, value) => ls.set(key, value),
}

import { resetMemoryLocalStore } from '../store/memoryLocalStore'
import { getLocalStore } from '../store'
import { taskGraphEngine } from '../taskGraphEngine'
import { captureBuilderMemory } from './captureMemory'
import { recallContext } from './recallContext'
import { formatMemoryBlock } from './formatMemoryBlock'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

async function run() {
  resetMemoryLocalStore()
  const store = getLocalStore()
  await store.init()
  await taskGraphEngine.init()

  const project = await taskGraphEngine.createProject({
    title: 'Auth app',
    goalText: 'Build authentication',
    governanceMode: 'assisted',
  })

  const epic = await taskGraphEngine.upsertNode({
    projectId: project.id,
    type: 'epic',
    title: 'Authentication',
    status: 'running',
  })

  const taskA = await taskGraphEngine.upsertNode({
    projectId: project.id,
    type: 'task',
    parentId: epic.id,
    title: 'Add JWT middleware',
    description: 'Implement token validation',
    status: 'done',
    assignedRole: 'builder',
  })

  const taskB = await taskGraphEngine.upsertNode({
    projectId: project.id,
    type: 'task',
    parentId: epic.id,
    title: 'Add login endpoint',
    description: 'JWT auth for login',
    status: 'pending',
    assignedRole: 'builder',
  })

  await captureBuilderMemory({
    project,
    node: taskA,
    summary: 'Added JWT middleware using existing auth module pattern',
    filesChanged: ['src/auth/jwt.ts'],
    useLlmDistill: false,
  })

  const recall = await recallContext({
    projectId: project.id,
    nodeId: taskB.id,
    agentRole: 'builder',
    epicId: epic.id,
    query: 'login JWT auth',
    limit: 5,
  })

  assert(recall.memories.length >= 1, 'recalls prior task memory')
  assert(recall.formattedBlock.includes('JWT'), 'formatted block includes JWT')
  assert(!recall.memories.some(m => m.nodeId === taskB.id), 'excludes self')

  const events = await store.listEvents({ projectId: project.id })
  assert(events.some(e => e.type === 'memory_recorded'), 'memory_recorded event')
  assert(events.some(e => e.type === 'fetch_context'), 'fetch_context event')

  const block = formatMemoryBlock(recall.memories)
  assert(block.startsWith('## Recalled project memory'), 'memory block header')

  console.log('recallContext.test.ts: all passed')
}

run().catch(err => {
  console.error(err)
  throw err
})
