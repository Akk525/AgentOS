import type { ActiveSession, OrchestratedSessionStatus, ReviewSession, SessionDependency } from '../types'
import type { GraphEdge, GraphNode, Project } from '../types/graph'

const DEFAULT_WORKSPACE = 'local'
const DEFAULT_PROVIDER = 'anthropic'
const DEFAULT_MODEL = 'claude-sonnet-4-6'

export function sessionIdForNode(node: GraphNode): string {
  return node.assignedSessionId ?? `sess-${node.id}`
}

function formatRoleName(role: string): string {
  return role
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function mapNodeStatusToSessionStatus(
  node: GraphNode,
): OrchestratedSessionStatus | null {
  if (node.type === 'epic') {
    return node.status === 'running' ? 'planning' : null
  }

  switch (node.status) {
    case 'pending':
      return 'queued'
    case 'assigned':
      return 'initializing'
    case 'running':
      return 'running'
    case 'review':
      return 'awaiting_review'
    case 'blocked':
      return 'blocked'
    case 'done':
    case 'failed':
      return null
    default:
      return 'queued'
  }
}

function nodeToActiveSession(node: GraphNode, project: Project): ActiveSession | null {
  const status = mapNodeStatusToSessionStatus(node)
  if (!status) return null

  const meta = node.metadata as Record<string, unknown>
  const role = node.assignedRole ?? (meta.role as string) ?? 'general'
  const agentName =
    (meta.assignedAgentName as string) ??
    (node.type === 'epic' ? ((meta.plannerName as string) ?? 'Lyra') : formatRoleName(role))
  const workspaceName =
    (meta.workspaceName as string) ?? project.title ?? DEFAULT_WORKSPACE

  return {
    id: node.type === 'epic'
      ? ((meta.plannerSessionId as string) ?? sessionIdForNode(node))
      : sessionIdForNode(node),
    taskTitle: node.title,
    agentId: (meta.assignedAgentId as string) ?? `agent-${role}`,
    agentName,
    agentRole: role,
    workspaceId: `ws-${project.id}`,
    workspaceName,
    branch: node.branch ?? 'main',
    providerId: (meta.provider as string) ?? DEFAULT_PROVIDER,
    providerName: ((meta.provider as string) ?? DEFAULT_PROVIDER).charAt(0).toUpperCase() +
      ((meta.provider as string) ?? DEFAULT_PROVIDER).slice(1),
    modelId: (meta.model as string) ?? DEFAULT_MODEL,
    status,
    startedAt: node.createdAt,
    patchVersion: (meta.patchVersion as number) ?? 0,
    interventionCount: 0,
    tokensUsed: (meta.tokensUsed as number) ?? 0,
    costUsd: (meta.costUsd as number) ?? 0,
    phase: status === 'planning' ? 'agent_replanning' : 'autonomous_running',
    blockReason: node.status === 'blocked' ? ((meta.blockReason as string) ?? 'Blocked by dependency') : undefined,
    testsPassed: meta.testsPassed as number | undefined,
    testsFailed: meta.testsFailed as number | undefined,
  }
}

export function graphToActiveSessions(nodes: GraphNode[], project: Project): ActiveSession[] {
  return nodes
    .map(node => nodeToActiveSession(node, project))
    .filter((s): s is ActiveSession => s !== null)
}

export function graphToSessionDependencies(
  nodes: GraphNode[],
  edges: GraphEdge[],
): SessionDependency[] {
  const nodeById = new Map(nodes.map(n => [n.id, n]))

  const deps: SessionDependency[] = []

  for (const edge of edges) {
    if (edge.edgeType !== 'depends_on') continue
    const fromNode = nodeById.get(edge.fromNodeId)
    const toNode = nodeById.get(edge.toNodeId)
    if (!fromNode || !toNode) continue
    deps.push({
      fromId: sessionIdForNode(fromNode),
      toId: sessionIdForNode(toNode),
      type: 'depends_on',
    })
  }

  return deps
}

export function layoutSessionPositions(
  sessions: ActiveSession[],
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {}
  const colWidth = 300
  const rowHeight = 145

  sessions.forEach((session, index) => {
    const col = index % 2
    const row = Math.floor(index / 2)
    positions[session.id] = { x: 80 + col * colWidth, y: 20 + row * rowHeight }
  })

  return positions
}

export function providerBindingsForSessions(
  sessions: ActiveSession[],
): [string, string][] {
  return sessions.map((session, index) => [
    session.id,
    session.providerId === 'openai' ? 'openai' : index % 3 === 2 ? 'openai' : 'anthropic',
  ])
}

export function graphToReviewSessions(nodes: GraphNode[]): ReviewSession[] {
  return nodes
    .filter(n => {
      if (n.type !== 'task' || n.status !== 'review') return false
      const role = n.assignedRole ?? (n.metadata.role as string | undefined)
      return role === 'reviewer'
    })
    .map(node => {
      const meta = node.metadata as Record<string, unknown>
      const sessionId = sessionIdForNode(node)
      return {
        id: `review-${node.id}`,
        patchSessionId: sessionId,
        reviewerAgentId: 'agent-reviewer',
        reviewerName: (meta.reviewerName as string) ?? 'Reviewer',
        status: 'running' as const,
        comments: [],
        assignedAt: (meta.startedAt as string) ?? node.createdAt,
      }
    })
}
