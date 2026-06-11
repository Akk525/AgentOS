/**
 * Run via: npx tsx src/runtime/memory/captureMemory.test.ts
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

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

async function run() {
  resetMemoryLocalStore()
  const store = getLocalStore()
  await store.init()
  await taskGraphEngine.init()

  const project = await taskGraphEngine.createProject({
    title: 'Test project',
    goalText: 'Test',
    governanceMode: 'assisted',
  })

  const node = await taskGraphEngine.upsertNode({
    projectId: project.id,
    type: 'task',
    title: 'Implement feature',
    status: 'done',
    assignedRole: 'builder',
  })

  const id1 = await captureBuilderMemory({
    project,
    node,
    summary: 'Implemented feature X',
    filesChanged: ['src/feature.ts'],
    useLlmDistill: false,
  })
  assert(!!id1, 'memory captured')

  const id2 = await captureBuilderMemory({
    project,
    node,
    summary: 'Implemented feature X',
    filesChanged: ['src/feature.ts'],
    useLlmDistill: false,
  })
  assert(id1 === id2, 'dedupes identical content')

  const memories = await store.listMemories({ projectId: project.id })
  assert(memories.length === 1, 'single memory row')

  const events = await store.listEvents({ projectId: project.id })
  assert(events.filter(e => e.type === 'memory_recorded').length === 1, 'one memory_recorded event')

  console.log('captureMemory.test.ts: all passed')
}

run().catch(err => {
  console.error(err)
  throw err
})
