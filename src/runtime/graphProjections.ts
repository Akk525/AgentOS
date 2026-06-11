import type { GraphEdge, GraphNode, Project } from '../types/graph'
import type { PlanSubtask, PlanSubtaskStatus, RuntimePlan, Task, TaskStatus } from '../types'

const STATUS_TO_TASK: Record<GraphNode['status'], TaskStatus> = {
  pending: 'backlog',
  assigned: 'claimed',
  running: 'running',
  review: 'review',
  blocked: 'needs_changes',
  done: 'done',
  failed: 'failed',
}

const STATUS_TO_SUBTASK: Record<GraphNode['status'], PlanSubtaskStatus> = {
  pending: 'pending',
  assigned: 'assigned',
  running: 'running',
  review: 'review',
  blocked: 'blocked',
  done: 'done',
  failed: 'blocked',
}

function nodeDependsOn(nodeId: string, edges: GraphEdge[]): string[] {
  return edges
    .filter(e => e.fromNodeId === nodeId && e.edgeType === 'depends_on')
    .map(e => e.toNodeId)
}

export function graphNodesToTasks(nodes: GraphNode[], project?: Project | null): Task[] {
  return nodes
    .filter(n => n.type === 'task')
    .map(n => {
      const meta = n.metadata as Record<string, unknown>
      return {
        id: n.id,
        title: n.title,
        description: n.description,
        repo: (meta.repo as string) ?? project?.title ?? 'local/project',
        branch: n.branch ?? 'main',
        worktree: meta.worktree as string | undefined,
        assignedAgentId: (meta.assignedAgentId as string) ?? `agent-${n.assignedRole ?? 'general'}`,
        assignedRole: n.assignedRole ?? (meta.role as string) ?? undefined,
        assignedAgentName: (meta.assignedAgentName as string) ?? undefined,
        model: (meta.model as string) ?? 'claude-sonnet-4-6',
        provider: (meta.provider as string) ?? 'anthropic',
        status: STATUS_TO_TASK[n.status],
        createdAt: n.createdAt,
        startedAt: meta.startedAt as string | undefined,
        completedAt: meta.completedAt as string | undefined,
        testStatus: meta.testStatus as Task['testStatus'],
        testsPassed: meta.testsPassed as number | undefined,
        testsFailed: meta.testsFailed as number | undefined,
        confidenceScore: meta.confidenceScore as number | undefined,
        riskScore: meta.riskScore as number | undefined,
        filesChanged: meta.filesChanged as string[] | undefined,
        linesAdded: meta.linesAdded as number | undefined,
        linesRemoved: meta.linesRemoved as number | undefined,
        tags: meta.tags as string[] | undefined,
        priority: meta.priority as Task['priority'],
        tokensUsed: meta.tokensUsed as number | undefined,
        costUsd: meta.costUsd as number | undefined,
        mergeConflict: meta.mergeConflict as boolean | undefined,
        blockReason: meta.blockReason as string | undefined,
      }
    })
}

export function graphToRuntimePlan(
  project: Project,
  nodes: GraphNode[],
  edges: GraphEdge[],
): RuntimePlan {
  const planMeta = nodes.find(n => n.type === 'epic')?.metadata ?? {}

  const subtasks: PlanSubtask[] = nodes
    .filter(n => n.type === 'task')
    .map(n => {
      const m = n.metadata as Record<string, unknown>
      return {
        id: n.id,
        planId: project.id,
        title: n.title,
        role: n.assignedRole ?? (m.role as string) ?? 'general',
        assignedSessionId: n.assignedSessionId ?? undefined,
        assignedAgentName: (m.assignedAgentName as string) ?? undefined,
        status: STATUS_TO_SUBTASK[n.status],
        dependsOn: nodeDependsOn(n.id, edges),
        branch: n.branch ?? undefined,
        patchVersion: m.patchVersion as number | undefined,
        testsPassed: m.testsPassed as number | undefined,
      }
    })

  const completedSubtasks = subtasks.filter(s => s.status === 'done').length

  return {
    id: project.id,
    title: project.title,
    description: project.goalText || project.title,
    plannerSessionId: (planMeta.plannerSessionId as string) ?? 'sess-planner',
    plannerName: (planMeta.plannerName as string) ?? 'Lyra',
    workspaceName: (planMeta.workspaceName as string) ?? 'boilerbyte',
    createdAt: project.createdAt,
    status: completedSubtasks === subtasks.length && subtasks.length > 0 ? 'completed' : 'active',
    subtasks,
    completedSubtasks,
    reasoning: (planMeta.reasoning as string) ?? project.goalText,
  }
}
