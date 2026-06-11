import { InferenceError } from '../inference/types'

export const PLANNER_ROLES = [
  'planner',
  'builder',
  'reviewer',
  'test-writer',
  'general',
] as const

export type PlannerTaskRole = (typeof PLANNER_ROLES)[number]

export interface PlannerTaskOutput {
  title: string
  description?: string
  role: PlannerTaskRole
  acceptanceCriteria: string[]
  dependsOnTitles?: string[]
  riskScore?: number
}

export interface PlannerOutput {
  title: string
  reasoning: string
  epic: { title: string; description: string }
  tasks: PlannerTaskOutput[]
}

const MIN_TASKS = 3
const MAX_TASKS = 12

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new InferenceError('invalid_plan', `Plan field "${field}" must be a non-empty string`)
  }
  return value.trim()
}

function asStringArray(value: unknown, field: string, minLength = 1): string[] {
  if (!Array.isArray(value)) {
    throw new InferenceError('invalid_plan', `Plan field "${field}" must be an array`)
  }
  const items = value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map(item => item.trim())
  if (items.length < minLength) {
    throw new InferenceError(
      'invalid_plan',
      `Plan field "${field}" must have at least ${minLength} item(s)`,
    )
  }
  return items
}

function asOptionalStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined
  return asStringArray(value, 'dependsOnTitles', 0)
}

function asRole(value: unknown): PlannerTaskRole {
  if (typeof value !== 'string' || !PLANNER_ROLES.includes(value as PlannerTaskRole)) {
    throw new InferenceError(
      'invalid_plan',
      `Task role must be one of: ${PLANNER_ROLES.join(', ')}`,
    )
  }
  return value as PlannerTaskRole
}

function asRiskScore(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new InferenceError('invalid_plan', 'Task riskScore must be a number between 0 and 100')
  }
  return Math.max(0, Math.min(100, Math.round(value)))
}

function validateDependencyDag(tasks: PlannerTaskOutput[]): void {
  const titles = new Set(tasks.map(t => t.title))
  const titleToIndex = new Map(tasks.map((t, i) => [t.title, i]))

  for (const task of tasks) {
    for (const dep of task.dependsOnTitles ?? []) {
      if (!titles.has(dep)) {
        throw new InferenceError(
          'invalid_plan',
          `Task "${task.title}" depends on unknown task "${dep}"`,
        )
      }
    }
  }

  const visiting = new Set<string>()
  const visited = new Set<string>()

  function visit(title: string): void {
    if (visited.has(title)) return
    if (visiting.has(title)) {
      throw new InferenceError('invalid_plan', `Circular dependency detected involving "${title}"`)
    }
    visiting.add(title)
    const task = tasks.find(t => t.title === title)
    for (const dep of task?.dependsOnTitles ?? []) {
      visit(dep)
    }
    visiting.delete(title)
    visited.add(title)
  }

  for (const task of tasks) {
    visit(task.title)
  }

  void titleToIndex
}

export function parsePlannerOutput(raw: string): PlannerOutput {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new InferenceError('invalid_plan', 'Planner response is not valid JSON')
  }

  if (!isRecord(parsed)) {
    throw new InferenceError('invalid_plan', 'Planner response must be a JSON object')
  }

  const title = asString(parsed.title, 'title')
  const reasoning = asString(parsed.reasoning, 'reasoning')

  if (!isRecord(parsed.epic)) {
    throw new InferenceError('invalid_plan', 'Plan must include an epic object')
  }
  const epic = {
    title: asString(parsed.epic.title, 'epic.title'),
    description: asString(parsed.epic.description, 'epic.description'),
  }

  if (!Array.isArray(parsed.tasks)) {
    throw new InferenceError('invalid_plan', 'Plan must include a tasks array')
  }

  const tasks: PlannerTaskOutput[] = parsed.tasks.map((task, index) => {
    if (!isRecord(task)) {
      throw new InferenceError('invalid_plan', `Task at index ${index} must be an object`)
    }
    return {
      title: asString(task.title, `tasks[${index}].title`),
      description: typeof task.description === 'string' ? task.description.trim() : undefined,
      role: asRole(task.role),
      acceptanceCriteria: asStringArray(task.acceptanceCriteria, `tasks[${index}].acceptanceCriteria`),
      dependsOnTitles: asOptionalStringArray(task.dependsOnTitles),
      riskScore: asRiskScore(task.riskScore),
    }
  })

  if (tasks.length < MIN_TASKS || tasks.length > MAX_TASKS) {
    throw new InferenceError(
      'invalid_plan',
      `Plan must contain between ${MIN_TASKS} and ${MAX_TASKS} tasks (got ${tasks.length})`,
    )
  }

  const uniqueTitles = new Set(tasks.map(t => t.title))
  if (uniqueTitles.size !== tasks.length) {
    throw new InferenceError('invalid_plan', 'Task titles must be unique within the plan')
  }

  validateDependencyDag(tasks)

  return { title, reasoning, epic, tasks }
}

export const PLANNER_SYSTEM_PROMPT = `You are Lyra, a software project planner for AgentOS.
Given a user's project goal, produce a structured execution plan as JSON only.

Output schema:
{
  "title": "short project title",
  "reasoning": "2-4 sentences explaining decomposition strategy",
  "epic": { "title": "epic title", "description": "epic scope summary" },
  "tasks": [
    {
      "title": "unique task title",
      "description": "optional detail",
      "role": "planner|builder|reviewer|test-writer|general",
      "acceptanceCriteria": ["measurable criterion", "..."],
      "dependsOnTitles": ["optional prior task title"],
      "riskScore": 0-100
    }
  ]
}

Rules:
- Return 4-8 tasks tailored to the specific goal (not generic templates).
- Each task needs at least one acceptance criterion.
- Use dependsOnTitles only to reference other task titles in the same plan.
- Never create circular dependencies.
- Assign roles appropriately: builder for implementation, test-writer for tests, reviewer for review, planner for requirements.
- Return JSON only, no markdown fences or commentary.`
