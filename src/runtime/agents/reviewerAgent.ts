import type { GraphEdge, GraphNode, Project } from '../../types/graph'
import type { TestResult } from '../../types'
import { completeForRole } from '../inference/inferenceRuntime'
import { findUpstreamNodeByRole } from '../graphWorktree'
import { getLocalStore } from '../store'
import { updateSessionData, getSessionData } from '../sessionStore'
import { taskGraphEngine } from '../taskGraphEngine'
import { REVIEWER_SYSTEM_PROMPT, parseReviewerOutput, type ReviewerOutput } from './reviewerSchema'

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function buildReviewPrompt(
  node: GraphNode,
  project: Project,
  diffSummary: string,
  testSummary: string,
  builderSummary: string,
): string {
  const criteria = node.acceptanceCriteria.length > 0
    ? node.acceptanceCriteria.map(c => `- ${c}`).join('\n')
    : '- Task completed correctly'

  return `Project goal:
${project.goalText}

Task under review: ${node.title}
Builder summary: ${builderSummary}

Acceptance criteria:
${criteria}

Diff summary:
${diffSummary}

Test results:
${testSummary}

Return a review verdict as JSON.`
}

function formatTestSummary(testResults: TestResult[]): string {
  if (testResults.length === 0) return 'No test results available'
  const passed = testResults.reduce((s, t) => s + t.passed, 0)
  const failed = testResults.reduce((s, t) => s + t.failed, 0)
  const lines = testResults.map(
    t => `- ${t.file}: ${t.passed} passed, ${t.failed} failed`,
  )
  return `Total: ${passed} passed, ${failed} failed\n${lines.join('\n')}`
}

async function loadUpstreamReviewContext(
  node: GraphNode,
  project: Project,
  nodes: GraphNode[],
  edges: GraphEdge[],
): Promise<{ diffSummary: string; testSummary: string; builderSummary: string }> {
  const builderNode = findUpstreamNodeByRole(node, nodes, edges, 'builder')
  const testNode = findUpstreamNodeByRole(node, nodes, edges, 'test-writer')

  let diffSummary = 'No diff available'
  let builderSummary = 'N/A'
  let testSummary = 'No test results available'

  if (builderNode) {
    const builderSession = await getSessionData(project.id, builderNode.id)
    if (builderSession?.diff.length) {
      diffSummary = builderSession.diff
        .map(d => `${d.path} (+${d.additions}/-${d.deletions})`)
        .join('\n')
    }
    builderSummary =
      (builderNode.metadata.builderSummary as string) ??
      builderSession?.completionNote?.summary ??
      'N/A'
  }

  if (testNode) {
    const testSession = await getSessionData(project.id, testNode.id)
    if (testSession?.testResults.length) {
      testSummary = formatTestSummary(testSession.testResults)
    } else {
      const meta = testNode.metadata as Record<string, unknown>
      const passed = meta.testsPassed as number | undefined
      const failed = meta.testsFailed as number | undefined
      if (passed !== undefined || failed !== undefined) {
        testSummary = `Total: ${passed ?? 0} passed, ${failed ?? 0} failed`
      }
    }
  } else {
    const session = await getSessionData(project.id, node.id)
    if (session?.diff.length) {
      diffSummary = session.diff
        .map(d => `${d.path} (+${d.additions}/-${d.deletions})`)
        .join('\n')
    }
    if (session?.testResults.length) {
      testSummary = formatTestSummary(session.testResults)
    }
  }

  return { diffSummary, testSummary, builderSummary }
}

export async function runReviewerForNode(
  node: GraphNode,
  project: Project,
): Promise<ReviewerOutput> {
  const sessionId = node.assignedSessionId ?? uid('sess')
  const graphState = taskGraphEngine.getState()
  const { nodes, edges } = graphState

  await taskGraphEngine.transitionNode(
    node.id,
    'assigned',
    { assignedAgentName: 'Reviewer' },
    { assignedSessionId: sessionId },
  )

  await getLocalStore().appendEvent({
    projectId: project.id,
    nodeId: node.id,
    sessionId,
    type: 'session_started',
    message: `Reviewer started: ${node.title}`,
    severity: 'info',
    payload: { agentName: 'Reviewer' },
  })

  await taskGraphEngine.transitionNode(node.id, 'running')

  const { diffSummary, testSummary, builderSummary } = await loadUpstreamReviewContext(
    node,
    project,
    nodes,
    edges,
  )

  const meta = node.metadata as Record<string, unknown>
  const result = await completeForRole(
    'reviewer',
    {
      messages: [
        { role: 'system', content: REVIEWER_SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildReviewPrompt(node, project, diffSummary, testSummary, builderSummary),
        },
      ],
      jsonMode: true,
      temperature: 0.1,
    },
    {
      providerId: meta.provider as string | undefined,
      modelId: meta.model as string | undefined,
    },
  )

  const review = parseReviewerOutput(result.content, sessionId)
  const testSession = findUpstreamNodeByRole(node, nodes, edges, 'test-writer')
  const testData = testSession
    ? await getSessionData(project.id, testSession.id)
    : await getSessionData(project.id, node.id)

  const testsRun = testData?.testResults.reduce((s, t) => s + t.passed + t.failed, 0) ?? 0
  const testsPassed = testData?.testResults.reduce((s, t) => s + t.passed, 0) ?? 0
  const testsFailed = testData?.testResults.reduce((s, t) => s + t.failed, 0) ?? 0

  const builderNode = findUpstreamNodeByRole(node, nodes, edges, 'builder')
  const builderSession = builderNode
    ? await getSessionData(project.id, builderNode.id)
    : null

  await updateSessionData(project.id, node.id, {
    events: review.comments.map(c => ({
      id: c.id,
      type: 'submit_review' as const,
      timestamp: c.timestamp,
      label: c.content,
      actor: 'agent' as const,
      detail: c.file,
    })),
    ...(builderSession?.diff.length ? { diff: builderSession.diff } : {}),
  })

  await getLocalStore().appendEvent({
    projectId: project.id,
    nodeId: node.id,
    sessionId,
    type: 'review_assigned',
    message: `Reviewer verdict: ${review.verdict} — ${review.summary}`,
    severity: review.verdict === 'reject' ? 'warning' : 'info',
    payload: {
      agentName: 'Reviewer',
      verdict: review.verdict,
      commentCount: review.comments.length,
      ...(result.usage ? { totalTokens: result.usage.totalTokens } : {}),
    },
  })

  await updateSessionData(project.id, node.id, {
    completionNote: {
      summary: review.summary,
      whatChanged: diffSummary !== 'No diff available' ? diffSummary.split('\n') : [],
      whyItChanged: review.summary,
      testsRun,
      testsPassed,
      testsFailed,
      unresolvedRisks: review.verdict === 'approve' ? [] : [review.summary],
      confidence: review.verdict === 'approve' ? 0.9 : 0.5,
      tokensUsed: result.usage?.totalTokens,
    },
  })

  const priorTokens = (meta.tokensUsed as number) ?? 0
  await taskGraphEngine.transitionNode(
    node.id,
    'review',
    {
      reviewerName: 'Reviewer',
      reviewVerdict: review.verdict,
      reviewSummary: review.summary,
      tokensUsed: priorTokens + (result.usage?.totalTokens ?? 0),
      startedAt: new Date().toISOString(),
    },
  )

  return review
}
