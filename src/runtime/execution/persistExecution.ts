import type { GraphNode, Project } from '../../types/graph'
import type { DiffFile, SessionData, TraceEvent } from '../../types'
import type { TokenUsage } from '../inference/types'
import { getLocalStore } from '../store'
import { updateSessionData } from '../sessionStore'
import { taskGraphEngine } from '../taskGraphEngine'

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
      tokensUsed: input.usage?.totalTokens,
    },
    totalTokens: input.usage?.totalTokens,
  })

  const priorTokens = (input.node.metadata.tokensUsed as number) ?? 0
  const priorCost = (input.node.metadata.costUsd as number) ?? 0
  const addedTokens = input.usage?.totalTokens ?? 0

  await taskGraphEngine.transitionNode(
    input.node.id,
    'review',
    {
      worktree: input.worktreePath,
      patchVersion: 1,
      filesChanged: input.filesChanged,
      linesAdded: input.linesAdded,
      linesRemoved: input.linesRemoved,
      builderSummary: input.summary,
      tokensUsed: priorTokens + addedTokens,
      costUsd: priorCost,
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

export async function persistReviewVerdict(input: PersistReviewVerdictInput): Promise<void> {
  const status = input.approved ? 'done' : 'failed'

  await taskGraphEngine.transitionNode(input.node.id, status, {
    reviewCompletedAt: new Date().toISOString(),
    reviewApproved: input.approved,
  })

  await getLocalStore().appendEvent({
    projectId: input.project.id,
    nodeId: input.node.id,
    sessionId: input.sessionId,
    type: input.approved ? 'review_approved' : 'session_completed',
    message: input.approved
      ? `Review approved: ${input.node.title}`
      : `Review rejected: ${input.node.title}`,
    severity: input.approved ? 'success' : 'warning',
    payload: {
      agentName: 'Reviewer',
      approved: input.approved,
    },
  })
}
