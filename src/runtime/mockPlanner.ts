import type { GovernanceMode, Project } from '../types/graph'
import { getLocalStore } from './store'
import { ensureTaskSessionShells } from './sessionStore'
import { taskGraphEngine } from './taskGraphEngine'

const PLANNER_NAME = 'Lyra'
const WORKSPACE_NAME = 'local'

const TASK_TEMPLATES = [
  { title: 'Define requirements and acceptance criteria', role: 'planner' },
  { title: 'Implement core functionality', role: 'builder' },
  { title: 'Add tests and validation', role: 'test-writer' },
  { title: 'Review and integrate', role: 'reviewer' },
] as const

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function deriveTitle(goalText: string): string {
  const line = goalText.trim().split('\n').find(l => l.trim()) ?? 'New project'
  return line.length > 80 ? `${line.slice(0, 77)}...` : line
}

export interface PlanFromGoalOptions {
  governanceMode?: GovernanceMode
}

export async function planFromGoal(
  goalText: string,
  options: PlanFromGoalOptions = {},
): Promise<Project> {
  const trimmed = goalText.trim()
  if (!trimmed) {
    throw new Error('Goal description is required')
  }

  const title = deriveTitle(trimmed)
  const epicId = uid('epic')
  const taskIds = TASK_TEMPLATES.map(() => uid('task'))

  const project = await taskGraphEngine.createProject({
    title,
    goalText: trimmed,
    governanceMode: options.governanceMode ?? 'assisted',
  })

  const reasoning =
    `Decomposed goal into ${TASK_TEMPLATES.length} sequential tasks: ` +
    TASK_TEMPLATES.map(t => t.title.toLowerCase()).join(' → ') +
    '.'

  await taskGraphEngine.upsertNode({
    id: epicId,
    projectId: project.id,
    type: 'epic',
    title,
    description: trimmed,
    status: 'running',
    metadata: {
      plannerSessionId: uid('sess'),
      plannerName: PLANNER_NAME,
      workspaceName: WORKSPACE_NAME,
      reasoning,
    },
  })

  await getLocalStore().appendEvent({
    projectId: project.id,
    type: 'plan_created',
    message: `${PLANNER_NAME} created plan: ${title}`,
    severity: 'info',
    payload: {
      agentName: PLANNER_NAME,
      workspaceName: WORKSPACE_NAME,
    },
  })

  for (let i = 0; i < TASK_TEMPLATES.length; i++) {
    const template = TASK_TEMPLATES[i]
    const taskId = taskIds[i]

    await taskGraphEngine.upsertNode({
      id: taskId,
      projectId: project.id,
      type: 'task',
      parentId: epicId,
      title: template.title,
      status: 'pending',
      assignedRole: template.role,
      metadata: {
        role: template.role,
        repo: 'local/project',
      },
    })

    if (i > 0) {
      await taskGraphEngine.upsertEdge({
        projectId: project.id,
        fromNodeId: taskId,
        toNodeId: taskIds[i - 1],
        edgeType: 'depends_on',
      })
    }
  }

  await ensureTaskSessionShells(project.id, taskIds)

  return project
}
