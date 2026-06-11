import type { AgentMemoryType, GraphNode, Project } from '../../types/graph'
import type { AgentRole } from '../inference/modelRouting'
import { getLocalStore } from '../store'
import {
  contentHash,
  getEpicTitle,
  inferTagsFromTitle,
  getActiveNodes,
} from './memoryUtils'

const USE_LLM_MEMORY_DISTILL = true

export interface CaptureMemoryInput {
  projectId: string
  nodeId?: string | null
  agentRole: AgentRole | 'planner'
  memoryType: AgentMemoryType
  content: string
  tags?: string[]
  sessionId?: string
  useLlmDistill?: boolean
}

async function recordMemoryEvent(
  projectId: string,
  nodeId: string | null | undefined,
  sessionId: string | undefined,
  memoryId: string,
  memoryType: AgentMemoryType,
  message: string,
): Promise<string> {
  const ev = await getLocalStore().appendEvent({
    projectId,
    nodeId: nodeId ?? null,
    sessionId,
    type: 'memory_recorded',
    message,
    severity: 'info',
    payload: { memoryId, memoryType, nodeId },
  })
  return ev.id
}

async function distillWithLlm(content: string, memoryType: AgentMemoryType): Promise<string> {
  try {
    const { completeForRole } = await import('../inference/inferenceRuntime')
    const result = await completeForRole('planner', {
      messages: [
        {
          role: 'user',
          content: `Distill this agent memory into one concise sentence (max 200 chars) for future recall. Type: ${memoryType}.\n\n${content}`,
        },
      ],
      temperature: 0.1,
      maxTokens: 120,
    })
    const distilled = result.content.trim()
    return distilled.length > 0 ? distilled.slice(0, 240) : content
  } catch {
    return content
  }
}

export async function captureMemory(input: CaptureMemoryInput): Promise<string | null> {
  const store = getLocalStore()
  let content = input.content.trim()
  if (!content) return null

  if (input.useLlmDistill ?? USE_LLM_MEMORY_DISTILL) {
    content = await distillWithLlm(content, input.memoryType)
  }

  const hash = contentHash(content)
  const tags = [...(input.tags ?? []), `hash:${hash}`]

  const existing = await store.listMemories({
    projectId: input.projectId,
    limit: 500,
  })
  const duplicate = existing.find(m => m.tags.includes(`hash:${hash}`))
  if (duplicate) return duplicate.id

  const memory = await store.upsertMemory({
    projectId: input.projectId,
    nodeId: input.nodeId ?? null,
    agentRole: input.agentRole,
    memoryType: input.memoryType,
    content,
    tags,
  })

  await recordMemoryEvent(
    input.projectId,
    input.nodeId,
    input.sessionId,
    memory.id,
    input.memoryType,
    `Memory recorded: ${input.memoryType}`,
  )

  return memory.id
}

export async function captureBuilderMemory(input: {
  project: Project
  node: GraphNode
  summary: string
  filesChanged: string[]
  sessionId?: string
  useLlmDistill?: boolean
}): Promise<string | null> {
  const nodes = getActiveNodes()
  const epicTitle = getEpicTitle(input.node.parentId ?? undefined, nodes)
  const tags = [
    ...(epicTitle ? [epicTitle] : []),
    ...(input.node.assignedRole ? [input.node.assignedRole] : []),
    ...inferTagsFromTitle(input.node.title),
  ]

  const files = input.filesChanged.length > 0 ? input.filesChanged.join(', ') : 'none'
  const content = `Task "${input.node.title}": ${input.summary}. Files: ${files}`

  return captureMemory({
    projectId: input.project.id,
    nodeId: input.node.id,
    agentRole: 'builder',
    memoryType: 'pattern',
    content,
    tags,
    sessionId: input.sessionId,
    useLlmDistill: input.useLlmDistill,
  })
}

export async function captureReviewMemory(input: {
  project: Project
  node: GraphNode
  summary: string
  approved: boolean
  sessionId?: string
  useLlmDistill?: boolean
}): Promise<string | null> {
  if (!input.approved) return null

  const nodes = getActiveNodes()
  const epicTitle = getEpicTitle(input.node.parentId ?? undefined, nodes)
  const tags = [
    ...(epicTitle ? [epicTitle] : []),
    'review',
    ...inferTagsFromTitle(input.node.title),
  ]

  const content = `Review approved for "${input.node.title}": ${input.summary}`

  return captureMemory({
    projectId: input.project.id,
    nodeId: input.node.id,
    agentRole: 'reviewer',
    memoryType: 'review_note',
    content,
    tags,
    sessionId: input.sessionId,
    useLlmDistill: input.useLlmDistill,
  })
}

export async function captureTestFailureMemory(input: {
  project: Project
  node: GraphNode
  failureSummary: string
  sessionId?: string
  useLlmDistill?: boolean
}): Promise<string | null> {
  const nodes = getActiveNodes()
  const epicTitle = getEpicTitle(input.node.parentId ?? undefined, nodes)
  const tags = [
    ...(epicTitle ? [epicTitle] : []),
    'test-failure',
    ...inferTagsFromTitle(input.node.title),
  ]

  const content = `Test failure on "${input.node.title}": ${input.failureSummary}`

  return captureMemory({
    projectId: input.project.id,
    nodeId: input.node.id,
    agentRole: 'test-writer',
    memoryType: 'bug_fix',
    content,
    tags,
    sessionId: input.sessionId,
    useLlmDistill: input.useLlmDistill,
  })
}

export async function capturePlannerMemory(input: {
  project: Project
  epicTitles: string[]
  goalText: string
  useLlmDistill?: boolean
}): Promise<string | null> {
  if (input.epicTitles.length === 0) return null

  const content = `Plan for "${input.project.title}": ${input.epicTitles.join('; ')}. Goal: ${input.goalText.slice(0, 200)}`

  return captureMemory({
    projectId: input.project.id,
    agentRole: 'planner',
    memoryType: 'decision',
    content,
    tags: ['planning', ...input.epicTitles.slice(0, 3)],
    useLlmDistill: input.useLlmDistill,
  })
}
