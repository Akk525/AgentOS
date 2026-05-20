import type { AgentCompletionNote, RuntimeMetrics } from '../types'

export const defaultMetrics: RuntimeMetrics = {
  tokensPerSec: 142,
  contextWindowPct: 0.68,
  activePhase: 'running tests',
  currentObjective: 'Verify mutex fix does not introduce deadlocks',
  runtimeHealth: 'good',
}

export const interventionTerminalLines: string[] = [
  '',
  '$ # Addressing intervention — checking error propagation',
  '$ grep -R "pendingRefresh" src/auth/',
  'src/auth/tokenManager.ts:  if (pendingRefresh) return pendingRefresh',
  '',
  '$ # Updating patch: propagate rejection to all concurrent waiters',
  '',
  '$ npm test -- --testPathPattern=auth',
  '',
  'PASS src/auth/__tests__/tokenManager.test.ts',
  '  ✓ Single refresh request succeeds (12 ms)',
  '  ✓ Concurrent requests deduplicated (31 ms)',
  '  ✓ All waiters receive rejection on failure (28 ms)',
  '  ✓ Expired session handled explicitly (19 ms)',
  '  ✓ 5 concurrent 401s resolved correctly (87 ms)',
  '',
  'Test Suites: 1 passed, 1 total',
  'Tests:       5 passed, 5 total',
  'Time:        2.341 s',
  '',
  '✓ Review package refreshed → Patch v2',
]

export const manualTestTerminalLines: string[] = [
  '',
  '$ npm test',
  '',
  'PASS src/auth/__tests__/tokenManager.test.ts',
  '  ✓ All 18 tests passing (146 ms)',
  '',
  'Test Suites: 1 passed, 1 total',
  'Tests:       18 passed, 18 total',
  'Time:        1.892 s',
]

export const updatedCompletionNote: AgentCompletionNote = {
  summary: 'Updated the token parsing logic based on your clarification. Error rejection is now propagated to all concurrent waiters, not just the first. Re-ran auth callback tests — all 97 passing.',
  whatChanged: [
    'Error propagation in mutex block now broadcasts rejection to all pending callers via Promise.reject sharing',
    'Added explicit handling for expired session edge case in authGuard.ts redirect path',
    'Updated test suite to simulate 5+ concurrent 401 responses — all resolve correctly',
  ],
  whyItChanged: 'You clarified that concurrent callers must all receive the rejection, not just the initiator. The previous implementation silently swallowed errors for waiters 2–n, causing silent failures on cold load under high concurrency.',
  testsRun: 97,
  testsPassed: 97,
  testsFailed: 0,
  unresolvedRisks: [],
  confidence: 0.94,
  tokensUsed: 22_840,
  costUsd: 0.091,
  runtimeSeconds: 632,
}
