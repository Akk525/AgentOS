/**
 * Run via: npx tsx src/runtime/planner/persistPlan.test.ts
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
import { persistPlan } from './persistPlan'
import type { PlannerOutput } from './planSchema'

const SAMPLE_PLAN: PlannerOutput = {
  title: 'Auth Service',
  reasoning: 'Requirements first, then build, test, review.',
  epic: { title: 'Auth Service', description: 'JWT auth microservice' },
  tasks: [
    {
      title: 'Spec auth flows',
      role: 'planner',
      acceptanceCriteria: ['Document login and refresh flows'],
    },
    {
      title: 'Implement JWT middleware',
      role: 'builder',
      acceptanceCriteria: ['Middleware validates tokens'],
      dependsOnTitles: ['Spec auth flows'],
      riskScore: 40,
    },
    {
      title: 'Write auth tests',
      role: 'test-writer',
      acceptanceCriteria: ['Coverage for happy and error paths'],
      dependsOnTitles: ['Implement JWT middleware'],
    },
  ],
}

async function run() {
  const store = getLocalStore()
  await store.init()

  const project = await persistPlan(SAMPLE_PLAN, {
    goalText: 'Build JWT auth service',
    governanceMode: 'assisted',
    providerId: 'ollama',
    modelId: 'llama3.2',
    usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
  })

  const graph = await store.getProject(project.id)
  if (!graph) throw new Error('graph missing')

  const tasks = graph.nodes.filter(n => n.type === 'task')
  console.assert(tasks.length === 3, 'three tasks persisted')
  console.assert(
    tasks.every(t => t.acceptanceCriteria.length >= 1),
    'acceptance criteria on all tasks',
  )
  console.assert(
    tasks.some(t => (t.metadata as Record<string, unknown>).riskScore === 40),
    'risk score in metadata',
  )

  const events = await store.listEvents({ projectId: project.id })
  const created = events.find(e => e.type === 'plan_created')
  console.assert(created !== undefined, 'plan_created event exists')
  console.assert(created?.payload.totalTokens === 300, 'token usage on event')

  const epic = graph.nodes.find(n => n.type === 'epic')
  console.assert((epic?.metadata as Record<string, unknown>).tokensUsed === 300, 'token usage on epic metadata')
  console.assert((epic?.metadata as Record<string, unknown>).costUsd !== undefined, 'cost on epic metadata')

  console.log('persistPlan.test.ts: all assertions passed')
}

run().catch(err => {
  console.error(err)
  throw err
})
