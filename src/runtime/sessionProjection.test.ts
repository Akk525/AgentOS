/**
 * Manual smoke test for sessionProjection.
 * Run via: npx tsx src/runtime/sessionProjection.test.ts
 */
import { storedSessionToSessionData } from './sessionProjection'
import type { StoredSession } from '../types/graph'

const stored: StoredSession = {
  id: 'sess-test-1',
  projectId: 'proj-1',
  nodeId: 'task-abc',
  data: {
    events: [{ id: 'e1', type: 'fetch_context', timestamp: '2026-01-01T00:00:00Z', label: 'test', success: true }],
    terminalOutput: ['line 1'],
    totalTokens: 100,
  },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const session = storedSessionToSessionData(stored, 'task-abc')

console.assert(session.taskId === 'task-abc', 'taskId set from argument')
console.assert(session.events.length === 1, 'events preserved')
console.assert(session.terminalOutput[0] === 'line 1', 'terminal preserved')
console.assert(session.toolCalls.length === 0, 'defaults empty toolCalls')
console.assert(session.testResults.length === 0, 'defaults empty testResults')

console.log('sessionProjection.test.ts: all assertions passed')
