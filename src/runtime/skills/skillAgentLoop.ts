import type { GraphNode, Project } from '../../types/graph'
import type { AgentRole } from '../inference/modelRouting'
import { completeForRole } from '../inference/inferenceRuntime'
import { InferenceError } from '../inference/types'
import { recordTokenUsage } from '../cost/recordTokenUsage'
import { formatSkillBlock, formatSkillContextBlock } from './formatSkillBlock'
import { emitSkillLoaded } from './emitSkillTrace'
import {
  parseSkillLoopTurn,
  SKILL_LOOP_REPAIR_PROMPT,
  SKILL_LOOP_SYSTEM_PROMPT,
} from './skillLoopSchema'
import { SKILL_LOOP_READ_TOOLS } from './skillToolSchema'
import { runSkillTool, type SkillToolContext } from './skillToolRunner'
import type { LoadedSkill, SkillLoopResult } from './skillTypes'

export const MAX_SKILL_LOOP_ITERATIONS = 15

export interface RunSkillAgentLoopInput {
  skills: LoadedSkill[]
  node: GraphNode
  project: Project
  worktreePath: string
  agentRole: AgentRole
  providerId?: string
  modelId?: string
  sessionId: string
}

function collectAllowedTools(skills: LoadedSkill[]): Set<string> {
  const tools = new Set<string>(SKILL_LOOP_READ_TOOLS)
  for (const skill of skills) {
    for (const tool of skill.tools) {
      if (SKILL_LOOP_READ_TOOLS.includes(tool)) {
        tools.add(tool)
      }
    }
  }
  return tools
}

function buildUserPrompt(
  node: GraphNode,
  project: Project,
  skills: LoadedSkill[],
  toolResults: { tool: string; result: string }[],
): string {
  const skillBlock = formatSkillBlock(skills)
  const criteria = node.acceptanceCriteria.length > 0
    ? node.acceptanceCriteria.map(c => `- ${c}`).join('\n')
    : '- Complete the task as described'

  const prior = toolResults.length > 0
    ? `\n\nPrior tool results:\n${toolResults.map(t => `### ${t.tool}\n${t.result.slice(0, 3000)}`).join('\n\n')}`
    : ''

  return `Project: ${project.title}
Task: ${node.title}
${node.description ? `Description: ${node.description}\n` : ''}
Acceptance criteria:
${criteria}

${skillBlock}
${prior}

Choose the next tool_call or finish.`
}

export async function runSkillAgentLoop(input: RunSkillAgentLoopInput): Promise<SkillLoopResult> {
  const { skills, node, project, worktreePath, agentRole, sessionId } = input
  const skillIds = skills.map(s => s.id)
  const skillNames = skills.map(s => s.name)

  await emitSkillLoaded(project.id, node.id, sessionId, skillIds, skillNames)

  const allowedTools = collectAllowedTools(skills)
  const toolCtx: SkillToolContext = {
    project,
    node,
    worktreePath,
    agentRole,
    sessionId,
    allowedTools,
  }

  const toolSteps: SkillLoopResult['toolSteps'] = []
  const toolResults: { tool: string; result: string }[] = []
  let totalTokens = 0
  let totalCostUsd = 0
  let iterations = 0

  const meta = node.metadata as Record<string, unknown>

  for (let i = 0; i < MAX_SKILL_LOOP_ITERATIONS; i++) {
    iterations = i + 1
    const userPrompt = buildUserPrompt(node, project, skills, toolResults)

    let result = await completeForRole(
      agentRole,
      {
        messages: [
          { role: 'system', content: SKILL_LOOP_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        jsonMode: true,
        temperature: 0.2,
      },
      {
        providerId: input.providerId ?? (meta.provider as string | undefined),
        modelId: input.modelId ?? (meta.model as string | undefined),
      },
    )

    if (result.usage) {
      const recorded = await recordTokenUsage({
        projectId: project.id,
        nodeId: node.id,
        sessionId,
        role: agentRole,
        usage: result.usage,
        providerId: result.providerId,
        modelId: result.model,
        message: `skill loop turn ${iterations}`,
      })
      totalTokens += recorded.addedTokens
      totalCostUsd += recorded.addedCostUsd
    }

    let turn
    try {
      turn = parseSkillLoopTurn(result.content)
    } catch (err) {
      if (err instanceof InferenceError && err.code === 'invalid_plan') {
        result = await completeForRole(
          agentRole,
          {
            messages: [
              { role: 'system', content: SKILL_LOOP_SYSTEM_PROMPT },
              { role: 'user', content: userPrompt },
              { role: 'assistant', content: result.content },
              { role: 'user', content: SKILL_LOOP_REPAIR_PROMPT },
            ],
            jsonMode: true,
            temperature: 0.1,
          },
          {
            providerId: input.providerId ?? (meta.provider as string | undefined),
            modelId: input.modelId ?? (meta.model as string | undefined),
          },
        )
        turn = parseSkillLoopTurn(result.content)
      } else {
        throw err
      }
    }

    if (turn.action === 'finish') {
      const contextBlock = formatSkillContextBlock(
        turn.summary,
        turn.context ?? toolResults.map(t => t.result).join('\n\n'),
      )
      return {
        summary: turn.summary,
        contextBlock,
        toolSteps,
        skillIds,
        iterations,
        totalTokens,
        totalCostUsd,
      }
    }

    const step = await runSkillTool(turn.tool, turn.args, toolCtx)
    toolSteps.push(step)
    toolResults.push({ tool: step.tool, result: step.result })
  }

  const fallbackSummary = `Skill loop reached max iterations (${MAX_SKILL_LOOP_ITERATIONS})`
  return {
    summary: fallbackSummary,
    contextBlock: formatSkillContextBlock(
      fallbackSummary,
      toolResults.map(t => t.result).join('\n\n'),
    ),
    toolSteps,
    skillIds,
    iterations,
    totalTokens,
    totalCostUsd,
  }
}

export function skillLoopInstructionOnly(skills: LoadedSkill[]): SkillLoopResult {
  return {
    summary: 'Skill loop skipped — instruction-only injection',
    contextBlock: formatSkillBlock(skills),
    toolSteps: [],
    skillIds: skills.map(s => s.id),
    iterations: 0,
    totalTokens: 0,
    totalCostUsd: 0,
  }
}
