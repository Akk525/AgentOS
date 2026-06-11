import type { GraphEdge, GraphNode, Project } from '../../types/graph'
import { getLocalStore } from '../store'
import { getSessionData } from '../sessionStore'
import { buildReplayTimeline } from './buildReplayTimeline'
import type { ProvenanceBundle, ProvenanceChain, ProvenanceChainLink, ReplayScope } from './replayTypes'

function topoSortTasks(tasks: GraphNode[], edges: GraphEdge[]): GraphNode[] {
  const taskIds = new Set(tasks.map(t => t.id))
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()

  for (const t of tasks) {
    inDegree.set(t.id, 0)
    adj.set(t.id, [])
  }

  for (const e of edges) {
    if (e.edgeType !== 'depends_on') continue
    if (!taskIds.has(e.fromNodeId) || !taskIds.has(e.toNodeId)) continue
    adj.get(e.toNodeId)!.push(e.fromNodeId)
    inDegree.set(e.fromNodeId, (inDegree.get(e.fromNodeId) ?? 0) + 1)
  }

  const queue = tasks.filter(t => (inDegree.get(t.id) ?? 0) === 0)
  const sorted: GraphNode[] = []

  while (queue.length > 0) {
    const node = queue.shift()!
    sorted.push(node)
    for (const next of adj.get(node.id) ?? []) {
      const deg = (inDegree.get(next) ?? 1) - 1
      inDegree.set(next, deg)
      if (deg === 0) {
        const n = tasks.find(t => t.id === next)
        if (n) queue.push(n)
      }
    }
  }

  return sorted.length === tasks.length ? sorted : tasks
}

export function resolveEpicForNode(nodeId: string, nodes: GraphNode[]): string | undefined {
  const node = nodes.find(n => n.id === nodeId)
  if (!node) return undefined
  if (node.type === 'epic') return node.id
  return node.parentId ?? undefined
}

export async function buildProvenanceChain(
  project: Project,
  nodes: GraphNode[],
  edges: GraphEdge[],
  scope: ReplayScope,
): Promise<ProvenanceChain> {
  const epicId = scope.epicId ?? (scope.nodeId ? resolveEpicForNode(scope.nodeId, nodes) : undefined)
  const epic = epicId ? nodes.find(n => n.id === epicId) : undefined
  const tasks = epicId
    ? topoSortTasks(nodes.filter(n => n.parentId === epicId && n.type === 'task'), edges)
    : scope.nodeId
      ? nodes.filter(n => n.id === scope.nodeId)
      : nodes.filter(n => n.type === 'task')

  const steps = await buildReplayTimeline(
    { projectId: project.id, nodeId: scope.nodeId, epicId },
    nodes,
    edges,
  )

  const links: ProvenanceChainLink[] = [
    { id: project.id, kind: 'project', title: project.title },
  ]

  if (epic) {
    links.push({ id: epic.id, kind: 'epic', title: epic.title, status: epic.status })
  }

  for (const task of tasks) {
    links.push({
      id: task.id,
      kind: 'task',
      title: task.title,
      role: task.assignedRole ?? (task.metadata.role as string | undefined),
      status: task.status,
    })
  }

  return {
    projectTitle: project.title,
    goalText: project.goalText,
    epic: epic
      ? { id: epic.id, kind: 'epic', title: epic.title, status: epic.status }
      : undefined,
    tasks: tasks.map(t => ({
      id: t.id,
      kind: 'task' as const,
      title: t.title,
      role: t.assignedRole ?? (t.metadata.role as string | undefined),
      status: t.status,
    })),
    stepCount: steps.length,
    links,
  }
}

export async function exportProvenanceBundle(
  projectId: string,
  epicId: string,
): Promise<ProvenanceBundle> {
  const store = getLocalStore()
  const graph = await store.getProject(projectId)
  if (!graph) {
    throw new Error(`Project not found: ${projectId}`)
  }

  const epic = graph.nodes.find(n => n.id === epicId)
  const tasks = graph.nodes.filter(n => n.parentId === epicId && n.type === 'task')
  const nodeIds = new Set([epicId, ...tasks.map(t => t.id)])

  const events = await store.listEvents({ projectId, order: 'asc', limit: 2000 })
  const filteredEvents = events.filter(
    ev => !ev.nodeId || nodeIds.has(ev.nodeId) || ev.type === 'plan_created',
  )

  const sessions: Record<string, unknown>[] = []
  for (const task of tasks) {
    const data = await getSessionData(projectId, task.id)
    if (data) sessions.push({ nodeId: task.id, data })
  }

  return {
    project: { ...graph.project },
    epic: epic ? { ...epic } : null,
    tasks: tasks.map(t => ({ ...t })),
    events: filteredEvents.map(e => ({ ...e })),
    sessions,
  }
}
