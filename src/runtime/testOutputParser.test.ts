/**
 * Run via: npx tsx src/runtime/testOutputParser.test.ts
 */
import { parseTestOutput } from './testOutputParser'

const JEST_PASS = `
PASS src/auth/session.test.ts
  ✓ returns null for missing token (8ms)
  ✓ returns null for expired session (4ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
Time:        1.243s
`

const JEST_FAIL = `
FAIL src/auth/session.test.ts
  ✗ rejects invalid token (5ms)

Test Suites: 1 failed, 1 total
Tests:       1 failed, 2 passed, 3 total
`

const VITEST_SUMMARY = `
 ✓ src/utils.test.ts (3 tests) 12ms

 Test Files  1 passed (1)
      Tests  3 passed | 0 failed
`

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

export function runTestOutputParserTests(): void {
  const pass = parseTestOutput(JEST_PASS, '', 0)
  assert(pass.success, 'jest pass should succeed')
  assert(pass.totalPassed === 2, `expected 2 passed, got ${pass.totalPassed}`)
  assert(pass.testResults.length >= 1, 'should parse file block')

  const fail = parseTestOutput(JEST_FAIL, '', 1)
  assert(!fail.success, 'jest fail should not succeed')
  assert(fail.totalFailed >= 1, `expected failures, got ${fail.totalFailed}`)

  const vitest = parseTestOutput(VITEST_SUMMARY, '', 0)
  assert(vitest.totalPassed === 3, `expected 3 vitest passed, got ${vitest.totalPassed}`)
}

export function run(): void {
  runTestOutputParserTests()
  console.log('testOutputParser.test.ts: all passed')
}

run()
