import type { TestResult } from '../types'

export interface ParsedTestOutput {
  testResults: TestResult[]
  totalPassed: number
  totalFailed: number
  totalSkipped: number
  coverageHint?: string
  rawStdout: string
  success: boolean
}

function parseSummaryLine(stdout: string): {
  passed: number
  failed: number
  skipped: number
} | null {
  const testsMatch = stdout.match(
    /Tests:\s+(?:(\d+)\s+failed,\s*)?(?:(\d+)\s+skipped,\s*)?(\d+)\s+passed(?:,\s*(\d+)\s+failed)?(?:,\s*(\d+)\s+skipped)?/i,
  )
  if (testsMatch) {
    const failed = Number(testsMatch[1] ?? testsMatch[4] ?? 0)
    const skipped = Number(testsMatch[2] ?? testsMatch[5] ?? 0)
    const passed = Number(testsMatch[3] ?? 0)
    return { passed, failed, skipped }
  }

  const vitestLine = stdout
    .split('\n')
    .find(line => /^\s*Tests\s+\d+\s+passed/i.test(line))
  if (vitestLine) {
    const vitestMatch = vitestLine.match(
      /(\d+)\s+passed(?:\s*\|\s*(\d+)\s+failed)?(?:\s*\|\s*(\d+)\s+skipped)?/i,
    )
    if (vitestMatch) {
      return {
        passed: Number(vitestMatch[1] ?? 0),
        failed: Number(vitestMatch[2] ?? 0),
        skipped: Number(vitestMatch[3] ?? 0),
      }
    }
  }

  return null
}

function parseCoverageHint(stdout: string): string | undefined {
  const lines = stdout.split('\n')
  for (const line of lines) {
    if (/all files\s*\|/i.test(line) || /% (stmts|statements)/i.test(line)) {
      return line.trim()
    }
    if (/Statements\s*:\s*[\d.]+%/i.test(line)) {
      return line.trim()
    }
  }
  return undefined
}

function parseFileBlocks(stdout: string): TestResult[] {
  const results: TestResult[] = []
  const lines = stdout.split('\n')
  let current: TestResult | null = null

  for (const line of lines) {
    const passMatch = line.match(/^(PASS|✓)\s+(.+?)(?:\s+\((\d+(?:\.\d+)?)\s*ms\))?$/i)
    const failMatch = line.match(/^(FAIL|✗|×)\s+(.+?)(?:\s+\((\d+(?:\.\d+)?)\s*ms\))?$/i)
    const fileMatch = line.match(/^(PASS|FAIL)\s+(\S+)/)

    if (fileMatch) {
      if (current) results.push(current)
      const status = fileMatch[1].toUpperCase()
      current = {
        file: fileMatch[2],
        suite: fileMatch[2],
        passed: status === 'PASS' ? 1 : 0,
        failed: status === 'FAIL' ? 1 : 0,
        skipped: 0,
        durationMs: 0,
        failures: status === 'FAIL' ? [] : undefined,
      }
      continue
    }

    if (passMatch && current) {
      current.passed += 1
      if (passMatch[3]) current.durationMs += Number(passMatch[3])
      continue
    }

    if (failMatch && current) {
      current.failed += 1
      if (failMatch[3]) current.durationMs += Number(failMatch[3])
      current.failures = current.failures ?? []
      current.failures.push({ name: failMatch[2], message: '' })
      continue
    }

    if (current?.failures?.length && line.trim().startsWith('●')) {
      const last = current.failures[current.failures.length - 1]
      if (!last.message) {
        last.message = line.trim()
      }
    }
  }

  if (current) results.push(current)
  return results
}

export function parseTestOutput(stdout: string, stderr: string, exitCode: number): ParsedTestOutput {
  const rawStdout = [stdout, stderr].filter(Boolean).join('\n')
  const summary = parseSummaryLine(rawStdout)
  const fileBlocks = parseFileBlocks(rawStdout)

  const totalPassed = summary?.passed ?? fileBlocks.reduce((s, t) => s + t.passed, 0)
  const totalFailed = summary?.failed ?? fileBlocks.reduce((s, t) => s + t.failed, 0)
  const totalSkipped = summary?.skipped ?? fileBlocks.reduce((s, t) => s + t.skipped, 0)

  const testResults =
    fileBlocks.length > 0
      ? fileBlocks
      : totalPassed + totalFailed > 0
        ? [
            {
              file: 'all',
              suite: 'test run',
              passed: totalPassed,
              failed: totalFailed,
              skipped: totalSkipped,
              durationMs: 0,
            },
          ]
        : []

  const success = exitCode === 0 && totalFailed === 0

  return {
    testResults,
    totalPassed,
    totalFailed,
    totalSkipped,
    coverageHint: parseCoverageHint(rawStdout),
    rawStdout,
    success,
  }
}
