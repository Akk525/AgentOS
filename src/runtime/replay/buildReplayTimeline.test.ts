/**
 * Run via: npx tsx src/runtime/replay/buildReplayTimeline.test.ts
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
import { buildReplayTimeline } from './buildReplayTimeline'
import { storedEventToOrchestrator } from '../eventProjection'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

async function run(): Promise<void> {
  const store = getLocalStore()
  await store.init()
  await taskGraphEngine.init()

  const project = await taskGraphEngine.createProject({
    title: 'Replay test',
    goalText: 'test replay timeline',
    governanceMode: 'assisted',
  })

  const epic = await taskGraphEngine.upsertNode({
    projectId: project.id,
    type: 'epic',
    title: 'Auth epic',
  })

  const task = await taskGraphEngine.upsertNode({
    projectId: project.id,
    type: 'task',
    parentId: epic.id,
    title: 'Build',
    assignedRole: 'builder',
  })

  await store.appendEvent({
    projectId: project.id,
    type: 'plan_created',
    message: 'Plan created',
    severity: 'info',
  })

  await store.appendEvent({
    projectId: project.id,
    nodeId: task.id,
    type: 'session_started',
    message: 'Builder started',
    severity: 'info',
    payload: { agentName: 'Builder' },
  })

  await store.appendEvent({
    projectId: project.id,
    nodeId: task.id,
    type: 'usage_recorded',
    message: 'Usage',
    severity: 'info',
    payload: { totalTokens: 50, costUsd: 0.001 },
  })

  await store.upsertSession({
    projectId: project.id,
    nodeId: task.id,
    data: {
      taskId: task.id,
      events: [
        {
          id: 'te-1',
          type: 'patch_updated',
          timestamp: '2026-06-01T12:00:01.000Z',
          label: 'Wrote files',
          actor: 'agent',
        },
      ],
      toolCalls: [],
      testResults: [],
      diff: [],
      terminalOutput: [],
    },
  })

  const nodes = taskGraphEngine.getState().nodes
  const epicSteps = await buildReplayTimeline({ projectId: project.id, epicId: epic.id }, nodes, [])
  assert(epicSteps.length >= 3, `epic timeline has steps, got ${epicSteps.length}`)
  assert(
    epicSteps.some(s => s.type === 'plan_created'),
    'includes plan_created for epic scope',
  )

  const taskSteps = await buildReplayTimeline({ projectId: project.id, nodeId: task.id }, nodes, [])
  assert(taskSteps.some(s => s.source === 'trace'), 'includes trace events')

  const projected = storedEventToOrchestrator(
    (await store.listEvents({ projectId: project.id })).find(e => e.type === 'usage_recorded')!,
  )
  assert(projected.type === 'usage_recorded', 'usage_recorded projection')

  console.log('buildReplayTimeline.test.ts: all passed')
}

run().catch(err => {
  console.error(err)
  throw err
})
