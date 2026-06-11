/**
 * Run via: npx tsx src/runtime/cost/recordTokenUsage.test.ts
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
import { recordTokenUsage } from './recordTokenUsage'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

async function run(): Promise<void> {
  const store = getLocalStore()
  await store.init()
  await taskGraphEngine.init()

  const project = await taskGraphEngine.createProject({
    title: 'Cost test',
    goalText: 'meter tokens',
    governanceMode: 'assisted',
  })

  const node = await taskGraphEngine.upsertNode({
    projectId: project.id,
    type: 'task',
    title: 'Builder task',
    metadata: { provider: 'anthropic', model: 'claude-sonnet-4-6' },
  })

  await store.upsertSession({
    projectId: project.id,
    nodeId: node.id,
    data: { taskId: node.id, events: [], toolCalls: [], testResults: [], diff: [], terminalOutput: [] },
  })

  const first = await recordTokenUsage({
    projectId: project.id,
    nodeId: node.id,
    sessionId: 'sess-1',
    providerId: 'anthropic',
    modelId: 'claude-sonnet-4-6',
    role: 'builder',
    usage: { promptTokens: 1000, completionTokens: 500, totalTokens: 1500 },
  })

  const second = await recordTokenUsage({
    projectId: project.id,
    nodeId: node.id,
    sessionId: 'sess-1',
    providerId: 'anthropic',
    modelId: 'claude-sonnet-4-6',
    role: 'builder',
    usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
  })

  assert(first.totalTokens === 1500, 'first call cumulative tokens')
  assert(second.totalTokens === 1800, 'second call cumulative tokens')
  assert(second.totalCostUsd > first.totalCostUsd, 'cost should accumulate')

  const updated = taskGraphEngine.getState().nodes.find(n => n.id === node.id)
  assert((updated?.metadata.tokensUsed as number) === 1800, 'node metadata tokens')
  assert((updated?.metadata.costUsd as number) > 0, 'node metadata cost')

  const sessions = await store.listSessions(project.id)
  const session = sessions.find(s => s.nodeId === node.id)
  const data = session?.data as { totalTokens?: number; totalCostUsd?: number }
  assert(data.totalTokens === 1800, 'session total tokens')
  assert((data.totalCostUsd ?? 0) > 0, 'session total cost')

  const events = await store.listEvents({ projectId: project.id })
  const usageEvents = events.filter(e => e.type === 'usage_recorded')
  assert(usageEvents.length === 2, 'usage_recorded events appended')

  console.log('recordTokenUsage.test.ts: all passed')
}

run().catch(err => {
  console.error(err)
  throw err
})
