import type { GovernanceMode, Project } from '../types/graph'
import type { PlanningPhase } from './agents/plannerAgent'
import { persistMockPlan } from './planner/persistPlan'

const TASK_TEMPLATES = [
  { title: 'Define requirements and acceptance criteria', role: 'planner' },
  { title: 'Implement core functionality', role: 'builder' },
  { title: 'Add tests and validation', role: 'test-writer' },
  { title: 'Review and integrate', role: 'reviewer' },
] as const

export interface PlanFromGoalOptions {
  governanceMode?: GovernanceMode
  providerId?: string
  modelId?: string
  mode?: 'llm' | 'mock'
  onPhase?: (phase: PlanningPhase) => void
  recalledMemory?: string
}

export async function planFromGoal(
  goalText: string,
  options: PlanFromGoalOptions = {},
): Promise<Project> {
  const trimmed = goalText.trim()
  if (!trimmed) {
    throw new Error('Goal description is required')
  }

  if (options.mode === 'mock') {
    return persistMockPlan(trimmed, TASK_TEMPLATES, {
      governanceMode: options.governanceMode,
    })
  }

  if (!options.providerId || !options.modelId) {
    throw new Error('Provider and model are required for planning')
  }

  const { planFromGoalWithLlm } = await import('./agents/plannerAgent')
  return planFromGoalWithLlm(trimmed, {
    governanceMode: options.governanceMode,
    providerId: options.providerId,
    modelId: options.modelId,
    onPhase: options.onPhase,
    recalledMemory: options.recalledMemory,
  })
}
