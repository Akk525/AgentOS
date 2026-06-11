import { InferenceError } from '../inference/types'
import type { SkillToolName } from './skillTypes'

export type SkillLoopTurn =
  | { action: 'tool_call'; tool: SkillToolName; args: Record<string, unknown> }
  | { action: 'finish'; summary: string; context?: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseSkillLoopTurn(raw: string): SkillLoopTurn {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new InferenceError('invalid_plan', 'Skill loop response is not valid JSON')
  }

  if (!isRecord(parsed) || typeof parsed.action !== 'string') {
    throw new InferenceError('invalid_plan', 'Skill loop response must include action')
  }

  if (parsed.action === 'tool_call') {
    if (typeof parsed.tool !== 'string') {
      throw new InferenceError('invalid_plan', 'tool_call requires tool name')
    }
    const args = isRecord(parsed.args) ? parsed.args : {}
    return { action: 'tool_call', tool: parsed.tool as SkillToolName, args }
  }

  if (parsed.action === 'finish') {
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : ''
    if (!summary) {
      throw new InferenceError('invalid_plan', 'finish requires summary')
    }
    const context = typeof parsed.context === 'string' ? parsed.context.trim() : undefined
    return { action: 'finish', summary, context }
  }

  throw new InferenceError('invalid_plan', `Unknown action: ${parsed.action}`)
}

export const SKILL_LOOP_SYSTEM_PROMPT = `You are a skill executor for AgentOS. Each turn you must return JSON only.

Available actions:
1. {"action":"tool_call","tool":"<tool>","args":{...}}
2. {"action":"finish","summary":"<brief summary>","context":"<gathered context for downstream agent>"}

Allowed tools: read_file, search_code, get_git_diff, fetch_context, run_tests

Tool args:
- read_file: {"path":"relative/path.ts"}
- search_code: {"query":"search terms","limit":20}
- get_git_diff: {}
- fetch_context: {"query":"optional memory query"}
- run_tests: {"command":"npm test"}

Use tools to gather context following the active skill instructions. When done, return finish with summary and context.
Do not propose file edits — the builder agent handles implementation.`

export const SKILL_LOOP_REPAIR_PROMPT =
  'Return only valid JSON for a skill loop turn. No markdown, no commentary.'
