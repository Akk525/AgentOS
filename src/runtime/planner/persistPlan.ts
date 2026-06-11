import type { GovernanceMode, Project } from '../../types/graph'
import type { TokenUsage } from '../inference/types'
import { recordTokenUsage } from '../cost/recordTokenUsage'
import { getLocalStore } from '../store'
import { ensureTaskSessionShells } from '../sessionStore'
import { taskGraphEngine } from '../taskGraphEngine'
import type { PlannerOutput } from './planSchema'

const PLANNER_NAME = 'Lyra'
const WORKSPACE_NAME = 'local'

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export interface PersistPlanOptions {
  goalText: string
  governanceMode?: GovernanceMode
  providerId: string
  modelId: string
  usage?: TokenUsage
}

export async function persistPlan(
  plan: PlannerOutput,
  options: PersistPlanOptions,
): Promise<Project> {
  const trimmed = options.goalText.trim()
  const epicId = uid('epic')
  const plannerSessionId = uid('sess')
  const titleToId = new Map<string, string>()

  const project = await taskGraphEngine.createProject({
    title: plan.title,
    goalText: trimmed,
    governanceMode: options.governanceMode ?? 'assisted',
  })

  await taskGraphEngine.upsertNode({
    id: epicId,
    projectId: project.id,
    type: 'epic',
    title: plan.epic.title,
    description: plan.epic.description,
    status: 'running',
    metadata: {
      plannerSessionId,
      plannerName: PLANNER_NAME,
      workspaceName: WORKSPACE_NAME,
      reasoning: plan.reasoning,
      provider: options.providerId,
      model: options.modelId,
    },
  })

  const taskIds: string[] = []

  for (const task of plan.tasks) {
    const taskId = uid('task')
    titleToId.set(task.title, taskId)
    taskIds.push(taskId)

    await taskGraphEngine.upsertNode({
      id: taskId,
      projectId: project.id,
      type: 'task',
      parentId: epicId,
      title: task.title,
      description: task.description ?? '',
      status: 'pending',
      assignedRole: task.role,
      acceptanceCriteria: task.acceptanceCriteria,
      metadata: {
        role: task.role,
        repo: 'local/project',
        provider: options.providerId,
        model: options.modelId,
        ...(task.riskScore !== undefined ? { riskScore: task.riskScore } : {}),
      },
    })
  }

  for (const task of plan.tasks) {
    const taskId = titleToId.get(task.title)!
    for (const depTitle of task.dependsOnTitles ?? []) {
      const depId = titleToId.get(depTitle)
      if (!depId) continue
      await taskGraphEngine.upsertEdge({
        projectId: project.id,
        fromNodeId: taskId,
        toNodeId: depId,
        edgeType: 'depends_on',
      })
    }
  }

  await getLocalStore().appendEvent({
    projectId: project.id,
    type: 'plan_created',
    message: `${PLANNER_NAME} created plan: ${plan.title}`,
    severity: 'info',
    payload: {
      agentName: PLANNER_NAME,
      workspaceName: WORKSPACE_NAME,
      providerId: options.providerId,
      modelId: options.modelId,
      taskCount: plan.tasks.length,
      ...(options.usage
        ? {
            promptTokens: options.usage.promptTokens,
            completionTokens: options.usage.completionTokens,
            totalTokens: options.usage.totalTokens,
          }
        : {}),
    },
  })

  if (options.usage) {
    await recordTokenUsage({
      projectId: project.id,
      nodeId: epicId,
      sessionId: plannerSessionId,
      providerId: options.providerId,
      modelId: options.modelId,
      role: 'planner',
      usage: options.usage,
      message: `Planner used ${options.usage.totalTokens.toLocaleString()} tokens`,
    })
  }

  await ensureTaskSessionShells(project.id, taskIds)

  return project
}

export interface MockPlanTemplate {
  title: string
  role: string
}

export async function persistMockPlan(
  goalText: string,
  templates: readonly MockPlanTemplate[],
  options: { governanceMode?: GovernanceMode } = {},
): Promise<Project> {
  const trimmed = goalText.trim()
  const deriveTitle = (text: string) => {
    const line = text.trim().split('\n').find(l => l.trim()) ?? 'New project'
    return line.length > 80 ? `${line.slice(0, 77)}...` : line
  }

  const plan: PlannerOutput = {
    title: deriveTitle(trimmed),
    reasoning:
      `Decomposed goal into ${templates.length} sequential tasks: ` +
      templates.map(t => t.title.toLowerCase()).join(' → ') +
      '.',
    epic: {
      title: deriveTitle(trimmed),
      description: trimmed,
    },
    tasks: templates.map((template, index) => ({
      title: template.title,
      role: template.role as PlannerOutput['tasks'][number]['role'],
      acceptanceCriteria: [`Complete: ${template.title}`],
      dependsOnTitles: index > 0 ? [templates[index - 1].title] : undefined,
    })),
  }

  return persistPlan(plan, {
    goalText: trimmed,
    governanceMode: options.governanceMode,
    providerId: 'mock',
    modelId: 'mock',
  })
}
