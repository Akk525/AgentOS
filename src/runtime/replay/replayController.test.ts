/**
 * Run via: npx tsx src/runtime/replay/replayController.test.ts
 */
import { ReplayController } from './replayController'
import type { ReplayStep } from './replayTypes'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

const steps: ReplayStep[] = [
  {
    id: '1',
    timestamp: '2026-01-01T10:00:00.000Z',
    source: 'stored',
    type: 'session_started',
    message: 'Builder started',
    nodeId: 'task-1',
  },
  {
    id: '2',
    timestamp: '2026-01-01T10:05:00.000Z',
    source: 'stored',
    type: 'usage_recorded',
    message: 'Builder used 100 tokens',
    nodeId: 'task-1',
    payload: { totalTokens: 100, costUsd: 0.01, cumulativeTokens: 100, cumulativeCostUsd: 0.01 },
  },
  {
    id: '3',
    timestamp: '2026-01-01T10:10:00.000Z',
    source: 'stored',
    type: 'patch_updated',
    message: 'Builder completed',
    nodeId: 'task-1',
  },
]

async function run(): Promise<void> {
  const controller = new ReplayController()
  await controller.load('proj-1', steps, [
    {
      id: 'task-1',
      projectId: 'proj-1',
      type: 'task',
      parentId: 'epic-1',
      title: 'Build auth',
      description: '',
      status: 'done',
      acceptanceCriteria: [],
      assignedRole: 'builder',
      assignedSessionId: null,
      branch: null,
      metadata: { tokensUsed: 100, costUsd: 0.01 },
      createdAt: '1',
      updatedAt: '1',
    },
  ])

  assert(controller.totalSteps === 3, 'total steps')
  assert(controller.currentIndex === 0, 'starts at 0')

  const first = controller.seek(0)
  assert(first?.step.type === 'session_started', 'first step type')

  const last = controller.stepForward()
  assert(last !== null, 'step forward')
  const again = controller.stepForward()
  assert(again?.step.type === 'patch_updated', 'third step')

  const back = controller.stepBack()
  assert(back?.step.type === 'usage_recorded', 'step back')
  assert(back?.cumulativeTokens === 100, 'cumulative tokens from usage event')

  assert(controller.stepForward() !== null && controller.stepForward() === null, 'end boundary')

  console.log('replayController.test.ts: all passed')
}

run().catch(err => {
  console.error(err)
  throw err
})
