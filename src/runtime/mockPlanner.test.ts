/**
 * Manual / future vitest coverage for mockPlanner.
 * Run via: npx tsx src/runtime/mockPlanner.test.ts (when tsx available)
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

import { planFromGoal } from './mockPlanner'
import { getLocalStore } from './store'
import { taskGraphEngine } from './taskGraphEngine'

async function run() {
  const store = getLocalStore()
  await store.init()

  const project = await planFromGoal('Build a REST API for task management', { mode: 'mock' })
  const graph = await store.getProject(project.id)

  if (!graph) throw new Error('project graph missing')

  const epics = graph.nodes.filter(n => n.type === 'epic')
  const tasks = graph.nodes.filter(n => n.type === 'task')
  const deps = graph.edges.filter(e => e.edgeType === 'depends_on')

  console.assert(epics.length === 1, `expected 1 epic, got ${epics.length}`)
  console.assert(tasks.length === 4, `expected 4 tasks, got ${tasks.length}`)
  console.assert(deps.length === 3, `expected 3 dependency edges, got ${deps.length}`)
  console.assert(project.goalText.includes('REST API'), 'goal text persisted')
  console.assert(
    tasks.every(t => t.acceptanceCriteria.length >= 1),
    'tasks have acceptance criteria',
  )

  const state = taskGraphEngine.getState()
  console.assert(state.activeProject?.id === project.id, 'active project loaded')
  console.assert(state.nodes.length === 5, `expected 5 nodes in engine, got ${state.nodes.length}`)

  console.log('mockPlanner.test.ts: all assertions passed')
}

run().catch(err => {
  console.error(err)
  throw err
})
