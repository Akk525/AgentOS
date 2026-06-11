import { InferenceError } from '../inference/types'
import type { ReviewComment, ReviewCommentType } from '../../types'

export type ReviewerVerdict = 'approve' | 'request_changes' | 'reject'

export interface ReviewerOutput {
  verdict: ReviewerVerdict
  comments: ReviewComment[]
  summary: string
}

const VALID_COMMENT_TYPES = new Set<ReviewCommentType>([
  'suggestion',
  'warning',
  'approval',
  'rejection',
  'question',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function parseReviewerOutput(raw: string, sessionId: string): ReviewerOutput {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new InferenceError('invalid_plan', 'Reviewer response is not valid JSON')
  }

  if (!isRecord(parsed)) {
    throw new InferenceError('invalid_plan', 'Reviewer response must be a JSON object')
  }

  const verdict = parsed.verdict
  if (verdict !== 'approve' && verdict !== 'request_changes' && verdict !== 'reject') {
    throw new InferenceError('invalid_plan', 'Reviewer verdict must be approve, request_changes, or reject')
  }

  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : ''
  if (!summary) {
    throw new InferenceError('invalid_plan', 'Reviewer summary is required')
  }

  const comments: ReviewComment[] = Array.isArray(parsed.comments)
    ? parsed.comments.map((comment, index) => {
        if (!isRecord(comment)) {
          throw new InferenceError('invalid_plan', `Comment at index ${index} must be an object`)
        }
        const type = comment.type as ReviewCommentType
        if (!VALID_COMMENT_TYPES.has(type)) {
          throw new InferenceError('invalid_plan', `Invalid comment type at index ${index}`)
        }
        const content = typeof comment.content === 'string' ? comment.content.trim() : ''
        if (!content) {
          throw new InferenceError('invalid_plan', `Comment at index ${index} has empty content`)
        }
        return {
          id: uid('rc'),
          sessionId,
          author: typeof comment.author === 'string' ? comment.author : 'Reviewer',
          type,
          content,
          file: typeof comment.file === 'string' ? comment.file : undefined,
          lineRange: typeof comment.lineRange === 'string' ? comment.lineRange : undefined,
          timestamp: new Date().toISOString(),
        }
      })
    : []

  return { verdict, comments, summary }
}

export const REVIEWER_SYSTEM_PROMPT = `You are a code reviewer agent for AgentOS.
Audit the builder's changes against acceptance criteria. Return JSON only.

Output schema:
{
  "verdict": "approve|request_changes|reject",
  "summary": "overall review summary",
  "comments": [
    {
      "author": "Reviewer",
      "type": "suggestion|warning|approval|rejection|question",
      "content": "comment text",
      "file": "optional/path",
      "lineRange": "optional range"
    }
  ]
}

Rules:
- Be strict on acceptance criteria.
- verdict "approve" only if criteria are met.
- Return JSON only, no markdown fences.`
