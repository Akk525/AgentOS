import { InferenceError } from '../inference/types'
import type { SkillToolName } from './skillTypes'

export const SKILL_LOOP_READ_TOOLS: SkillToolName[] = [
  'read_file',
  'search_code',
  'get_git_diff',
  'fetch_context',
  'run_tests',
]

export interface ValidatedToolCall {
  tool: SkillToolName
  args: Record<string, unknown>
}

function requireString(args: Record<string, unknown>, key: string, tool: string): string {
  const value = args[key]
  if (typeof value !== 'string' || !value.trim()) {
    throw new InferenceError('invalid_plan', `${tool} requires string arg "${key}"`)
  }
  return value.trim()
}

export function validateToolCall(tool: string, args: unknown): ValidatedToolCall {
  if (!SKILL_LOOP_READ_TOOLS.includes(tool as SkillToolName)) {
    throw new InferenceError('invalid_plan', `Tool not allowed in skill loop: ${tool}`)
  }

  const record = (typeof args === 'object' && args !== null && !Array.isArray(args))
    ? args as Record<string, unknown>
    : {}

  switch (tool as SkillToolName) {
    case 'read_file':
      return { tool: 'read_file', args: { path: requireString(record, 'path', 'read_file') } }
    case 'search_code':
      return {
        tool: 'search_code',
        args: {
          query: requireString(record, 'query', 'search_code'),
          limit: typeof record.limit === 'number' ? record.limit : 20,
        },
      }
    case 'get_git_diff':
      return { tool: 'get_git_diff', args: {} }
    case 'fetch_context':
      return {
        tool: 'fetch_context',
        args: {
          query: typeof record.query === 'string' ? record.query.trim() : undefined,
        },
      }
    case 'run_tests':
      return {
        tool: 'run_tests',
        args: {
          command: typeof record.command === 'string' ? record.command.trim() : undefined,
        },
      }
    default:
      throw new InferenceError('invalid_plan', `Unknown tool: ${tool}`)
  }
}

export function toolTraceType(tool: SkillToolName): string {
  return tool
}
