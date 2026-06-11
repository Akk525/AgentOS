import type { GraphNode, Project } from '../../types/graph'
import type { DiffFile, SessionData, TraceEvent } from '../../types'
import type { GraphEdge } from '../../types/graph'
import type { TokenUsage } from '../inference/types'
import { recordTokenUsage } from '../cost/recordTokenUsage'
import type { ParsedTestOutput } from '../testOutputParser'
import { findUpstreamNodeByRole } from '../graphWorktree'
import { getLocalStore } from '../store'
import { updateSessionData } from '../sessionStore'
import { taskGraphEngine } from '../taskGraphEngine'
import { spawnBuilderFixTask } from './spawnBuilderFixTask'
import { archiveWorktreeAfterReject, mergeAfterApproval } from './mergeAfterApproval'

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export interface PersistBuilderResultInput {
  node: GraphNode
  project: Project
  sessionId: string
  summary: string
  diff: DiffFile[]
  terminalOutput: string[]
  worktreePath: string
  branchName: string
  filesChanged: string[]
  linesAdded: number
  linesRemoved: number
  usage?: TokenUsage
}

export async function persistBuilderResult(input: PersistBuilderResultInput): Promise<SessionData> {
  const traceEvent: TraceEvent = {
    id: uid('te'),
    type: 'patch_updated',
    timestamp: new Date().toISOString(),
    label: input.summary,
    actor: 'agent',
  }

  let usageTotals = { totalTokens: 0, totalCostUsd: 0 }
  if (input.usage) {
    const meta = input.node.metadata as Record<string, unknown>
    const recorded = await recordTokenUsage({
      projectId: input.project.id,
      nodeId: input.node.id,
      sessionId: input.sessionId,
      providerId: (meta.provider as string) ?? 'anthropic',
      modelId: (meta.model as string) ?? 'claude-sonnet-4-6',
      role: 'builder',
      usage: input.usage,
      message: `Builder used ${input.usage.totalTokens.toLocaleString()} tokens`,
    })
    usageTotals = { totalTokens: recorded.totalTokens, totalCostUsd: recorded.totalCostUsd }
  }

  const existing = await updateSessionData(input.project.id, input.node.id, {
    events: [traceEvent],
    diff: input.diff,
    terminalOutput: input.terminalOutput,
    completionNote: {
      summary: input.summary,
      whatChanged: input.filesChanged,
      whyItChanged: input.summary,
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0,
      unresolvedRisks: [],
      confidence: 0.85,
      tokensUsed: usageTotals.totalTokens || input.usage?.totalTokens,
      costUsd: usageTotals.totalCostUsd || undefined,
    },
    totalTokens: usageTotals.totalTokens || input.usage?.totalTokens,
    totalCostUsd: usageTotals.totalCostUsd || undefined,
  })

  await taskGraphEngine.transitionNode(
    input.node.id,
    'done',
    {
      worktree: input.worktreePath,
      patchVersion: 1,
      filesChanged: input.filesChanged,
      linesAdded: input.linesAdded,
      linesRemoved: input.linesRemoved,
      builderSummary: input.summary,
      completedAt: new Date().toISOString(),
    },
    { assignedSessionId: input.sessionId, branch: input.branchName },
  )

  await getLocalStore().appendEvent({
    projectId: input.project.id,
    nodeId: input.node.id,
    sessionId: input.sessionId,
    type: 'patch_updated',
    message: `Builder completed: ${input.summary}`,
    severity: 'info',
    payload: {
      agentName: 'Builder',
      filesChanged: input.filesChanged.length,
      linesAdded: input.linesAdded,
      linesRemoved: input.linesRemoved,
      ...(input.usage
        ? {
            promptTokens: input.usage.promptTokens,
            completionTokens: input.usage.completionTokens,
            totalTokens: input.usage.totalTokens,
          }
        : {}),
    },
  })

  return existing
}

export interface PersistReviewVerdictInput {
  node: GraphNode
  project: Project
  sessionId: string
  approved: boolean
  comments?: SessionData['events']
}

export interface PersistTesterResultInput {
  node: GraphNode
  project: Project
  sessionId: string
  parsed: ParsedTestOutput
  terminalOutput: string[]
  testCommand: string
}

export async function persistTesterResult(input: PersistTesterResultInput): Promise<SessionData> {
  const { node, project, sessionId, parsed, terminalOutput, testCommand } = input
  const testsRun = parsed.totalPassed + parsed.totalFailed + parsed.totalSkipped

  const traceEvent: TraceEvent = {
    id: uid('te'),
    type: 'run_tests',
    timestamp: new Date().toISOString(),
    label: `${parsed.totalPassed} passed, ${parsed.totalFailed} failed`,
    actor: 'agent',
  }

  const existing = await updateSessionData(project.id, node.id, {
    events: [traceEvent],
    testResults: parsed.testResults,
    terminalOutput,
    completionNote: {
      summary: `Tests passed (${parsed.totalPassed}/${testsRun})`,
      whatChanged: [],
      whyItChanged: `Ran ${testCommand}`,
      testsRun,
      testsPassed: parsed.totalPassed,
      testsFailed: parsed.totalFailed,
      unresolvedRisks: [],
      confidence: parsed.totalFailed === 0 ? 0.95 : 0.4,
    },
  })

  await taskGraphEngine.transitionNode(
    node.id,
    'done',
    {
      testsPassed: parsed.totalPassed,
      testsFailed: parsed.totalFailed,
      testStatus: 'passed',
      coverageHint: parsed.coverageHint,
      completedAt: new Date().toISOString(),
      testCommand,
    },
    { assignedSessionId: sessionId },
  )

  await getLocalStore().appendEvent({
    projectId: project.id,
    nodeId: node.id,
    sessionId,
    type: 'tests_passed',
    message: `Tests passed: ${node.title} (${parsed.totalPassed}/${testsRun})`,
    severity: 'success',
    payload: {
      agentName: 'Test Writer',
      testsPassed: parsed.totalPassed,
      testsFailed: parsed.totalFailed,
      testsRun,
      coverageHint: parsed.coverageHint,
    },
  })

  return existing
}

export interface PersistTestFailureInput {
  node: GraphNode
  project: Project
  sessionId: string
  parsed: ParsedTestOutput
  terminalOutput: string[]
  testCommand: string
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export async function persistTestFailure(input: PersistTestFailureInput): Promise<SessionData> {
  const { node, project, sessionId, parsed, terminalOutput, testCommand, nodes, edges } = input
  const testsRun = parsed.totalPassed + parsed.totalFailed + parsed.totalSkipped
  const failureSummary =
    parsed.testResults
      .flatMap(t => t.failures?.map(f => `${t.file}: ${f.name}`) ?? [])
      .slice(0, 5)
      .join('; ') || `${parsed.totalFailed} test(s) failed`

  const traceEvent: TraceEvent = {
    id: uid('te'),
    type: 'run_tests',
    timestamp: new Date().toISOString(),
    label: failureSummary,
    actor: 'agent',
  }

  const existing = await updateSessionData(project.id, node.id, {
    events: [traceEvent],
    testResults: parsed.testResults,
    terminalOutput,
    completionNote: {
      summary: `Tests failed (${parsed.totalFailed}/${testsRun})`,
      whatChanged: [],
      whyItChanged: `Ran ${testCommand}`,
      testsRun,
      testsPassed: parsed.totalPassed,
      testsFailed: parsed.totalFailed,
      unresolvedRisks: [failureSummary],
      confidence: 0.2,
    },
  })

  await taskGraphEngine.transitionNode(node.id, 'failed', {
    testsPassed: parsed.totalPassed,
    testsFailed: parsed.totalFailed,
    testStatus: 'failed',
    testFailureSummary: failureSummary,
    completedAt: new Date().toISOString(),
    testCommand,
  })

  await getLocalStore().appendEvent({
    projectId: project.id,
    nodeId: node.id,
    sessionId,
    type: 'tests_failed',
    message: `Tests failed: ${node.title} — ${failureSummary}`,
    severity: 'error',
    payload: {
      agentName: 'Test Writer',
      testsPassed: parsed.totalPassed,
      testsFailed: parsed.totalFailed,
      testsRun,
    },
  })

  const upstreamBuilder = findUpstreamNodeByRole(node, nodes, edges, 'builder')
  await spawnBuilderFixTask({
    project,
    failedTestNode: node,
    failureSummary,
    upstreamBuilder,
  })

  return existing
}

export async function persistReviewVerdict(input: PersistReviewVerdictInput): Promise<void> {
  const graphState = taskGraphEngine.getState()
  const { nodes, edges } = graphState

  if (input.approved) {
    const mergeResult = await mergeAfterApproval({
      reviewerNode: input.node,
      project: input.project,
      sessionId: input.sessionId,
      nodes,
      edges,
    })

    if (mergeResult.outcome === 'conflict') {
      return
    }

    if (mergeResult.outcome === 'error') {
      await taskGraphEngine.transitionNode(input.node.id, 'failed', {
        reviewCompletedAt: new Date().toISOString(),
        reviewApproved: false,
        blockReason: mergeResult.message,
      })
      await getLocalStore().appendEvent({
        projectId: input.project.id,
        nodeId: input.node.id,
        sessionId: input.sessionId,
        type: 'session_completed',
        message: `Merge failed: ${mergeResult.message}`,
        severity: 'error',
        payload: { agentName: 'Governance', approved: false },
      })
      return
    }

    await taskGraphEngine.transitionNode(input.node.id, 'done', {
      reviewCompletedAt: new Date().toISOString(),
      reviewApproved: true,
      ...(mergeResult.outcome === 'merged'
        ? { mergedBranch: mergeResult.branchName, mergeTarget: mergeResult.targetBranch }
        : {}),
    })

    await getLocalStore().appendEvent({
      projectId: input.project.id,
      nodeId: input.node.id,
      sessionId: input.sessionId,
      type: 'review_approved',
      message: `Review approved: ${input.node.title}`,
      severity: 'success',
      payload: {
        agentName: 'Reviewer',
        approved: true,
        mergeOutcome: mergeResult.outcome,
      },
    })
    return
  }

  await archiveWorktreeAfterReject(
    input.node,
    input.project,
    input.sessionId,
    nodes,
    edges,
  )

  await taskGraphEngine.transitionNode(input.node.id, 'failed', {
    reviewCompletedAt: new Date().toISOString(),
    reviewApproved: false,
  })

  await getLocalStore().appendEvent({
    projectId: input.project.id,
    nodeId: input.node.id,
    sessionId: input.sessionId,
    type: 'session_completed',
    message: `Review rejected: ${input.node.title}`,
    severity: 'warning',
    payload: {
      agentName: 'Reviewer',
      approved: false,
    },
  })
}
