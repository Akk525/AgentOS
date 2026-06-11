export type SkillScope = 'personal' | 'project' | 'bundled'

export type SkillToolName =
  | 'read_file'
  | 'search_code'
  | 'get_git_diff'
  | 'fetch_context'
  | 'run_tests'
  | 'edit_file'
  | 'create_file'
  | 'run_command'

export interface LoadedSkill {
  id: string
  name: string
  description: string
  body: string
  sourcePath: string
  scope: SkillScope
  tools: SkillToolName[]
}

export interface SkillLoopToolStep {
  tool: SkillToolName
  args: Record<string, unknown>
  result: string
  traceType: string
}

export interface SkillLoopResult {
  summary: string
  contextBlock: string
  toolSteps: SkillLoopToolStep[]
  skillIds: string[]
  iterations: number
  totalTokens: number
  totalCostUsd: number
}
