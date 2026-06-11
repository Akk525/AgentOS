import type { GraphNode, Project } from '../../types/graph'
import { completeForRole } from '../inference/inferenceRuntime'
import { getLocalStore } from '../store'
import { updateSessionData } from '../sessionStore'
import { getSessionData } from '../sessionStore'
import { REVIEWER_SYSTEM_PROMPT, parseReviewerOutput } from './reviewerSchema'

function buildReviewPrompt(node: GraphNode, project: Project, diffSummary: string): string {
  const criteria = node.acceptanceCriteria.length > 0
    ? node.acceptanceCriteria.map(c => `- ${c}`).join('\n')
    : '- Task completed correctly'

  return `Project goal:
${project.goalText}

Task under review: ${node.title}
Builder summary: ${(node.metadata.builderSummary as string) ?? 'N/A'}

Acceptance criteria:
${criteria}

Diff summary:
${diffSummary}

Return a review verdict as JSON.`
}

export async function runReviewerForNode(
  node: GraphNode,
  project: Project,
): Promise<void> {
  const sessionId = node.assignedSessionId ?? `sess-${node.id}`
  const session = await getSessionData(project.id, node.id)
  const diffSummary = session?.diff.length
    ? session.diff.map(d => `${d.path} (+${d.additions}/-${d.deletions})`).join('\n')
    : 'No diff available'

  const meta = node.metadata as Record<string, unknown>
  const result = await completeForRole(
    'reviewer',
    {
      messages: [
        { role: 'system', content: REVIEWER_SYSTEM_PROMPT },
        { role: 'user', content: buildReviewPrompt(node, project, diffSummary) },
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

  await updateSessionData(project.id, node.id, {
    events: review.comments.map(c => ({
      id: c.id,
      type: 'submit_review' as const,
      timestamp: c.timestamp,
      label: c.content,
      actor: 'agent' as const,
      detail: c.file,
    })),
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
      ...(result.usage
        ? { totalTokens: result.usage.totalTokens }
        : {}),
    },
  })

  await updateSessionData(project.id, node.id, {
    completionNote: {
      summary: review.summary,
      whatChanged: session?.diff.map(d => d.path) ?? [],
      whyItChanged: review.summary,
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0,
      unresolvedRisks: review.verdict === 'approve' ? [] : [review.summary],
      confidence: review.verdict === 'approve' ? 0.9 : 0.5,
    },
  })
}
