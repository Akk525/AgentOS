import type { GovernanceMode, Project } from '../../types/graph'
import { completeForRole } from '../inference/inferenceRuntime'
import { InferenceError } from '../inference/types'
import { parsePlannerOutput, PLANNER_SYSTEM_PROMPT } from '../planner/planSchema'
import { persistPlan } from '../planner/persistPlan'

export type PlanningPhase = 'calling_provider' | 'parsing_plan' | 'writing_graph'

export interface PlannerAgentOptions {
  governanceMode?: GovernanceMode
  providerId: string
  modelId: string
  onPhase?: (phase: PlanningPhase) => void
  recalledMemory?: string
}

function buildUserPrompt(
  goalText: string,
  governanceMode: GovernanceMode,
  recalledMemory?: string,
): string {
  return `Project goal:
${goalText.trim()}

Governance mode: ${governanceMode}
${recalledMemory ? `\n${recalledMemory}\n` : ''}
Decompose this goal into an executable task graph. Return JSON matching the schema.`
}

const REPAIR_PROMPT = `Your previous response was invalid or incomplete. Return only valid JSON matching the required schema. No markdown, no commentary.`

export async function planFromGoalWithLlm(
  goalText: string,
  options: PlannerAgentOptions,
): Promise<Project> {
  const trimmed = goalText.trim()
  if (!trimmed) {
    throw new Error('Goal description is required')
  }

  const governanceMode = options.governanceMode ?? 'assisted'
  options.onPhase?.('calling_provider')

  const userPrompt = buildUserPrompt(trimmed, governanceMode, options.recalledMemory)
  let result = await completeForRole(
    'planner',
    {
      messages: [
        { role: 'system', content: PLANNER_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      jsonMode: true,
      temperature: 0.2,
    },
    {
      providerId: options.providerId,
      modelId: options.modelId,
    },
  )

  options.onPhase?.('parsing_plan')

  let plan
  try {
    plan = parsePlannerOutput(result.content)
  } catch (firstErr) {
    if (!(firstErr instanceof InferenceError) || firstErr.code !== 'invalid_plan') {
      throw firstErr
    }

    result = await completeForRole(
      'planner',
      {
        messages: [
          { role: 'system', content: PLANNER_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: result.content },
          { role: 'user', content: `${REPAIR_PROMPT}\n\nValidation error: ${firstErr.message}` },
        ],
        jsonMode: true,
        temperature: 0.1,
      },
      {
        providerId: options.providerId,
        modelId: options.modelId,
      },
    )

    plan = parsePlannerOutput(result.content)
  }

  options.onPhase?.('writing_graph')

  return persistPlan(plan, {
    goalText: trimmed,
    governanceMode,
    providerId: options.providerId,
    modelId: options.modelId,
    usage: result.usage,
  })
}
