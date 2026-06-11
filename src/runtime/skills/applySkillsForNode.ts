import type { GraphNode, Project } from '../../types/graph'
import type { AgentRole } from '../inference/modelRouting'
import { getDesktopBridge } from '../desktop/desktopBridge'
import { taskGraphEngine } from '../taskGraphEngine'
import { runSkillAgentLoop, skillLoopInstructionOnly } from './skillAgentLoop'
import { resolveSkillsForNode } from './resolveSkillsForNode'
import type { SkillLoopResult } from './skillTypes'

export interface ApplySkillsInput {
  node: GraphNode
  project: Project
  worktreePath: string
  agentRole: AgentRole
  providerId?: string
  modelId?: string
  sessionId: string
}

export async function applySkillsForNode(input: ApplySkillsInput): Promise<SkillLoopResult | null> {
  await skillRegistryRefresh(input.project, input.worktreePath)

  const skills = resolveSkillsForNode(input.node)
  if (skills.length === 0) return null

  await taskGraphEngine.updateNodeMetadata(input.node.id, {
    skillIds: skills.map(s => s.id),
  })

  const bridge = await getDesktopBridge()
  if (bridge.environment === 'web') {
    return skillLoopInstructionOnly(skills)
  }

  return runSkillAgentLoop({
    skills,
    node: input.node,
    project: input.project,
    worktreePath: input.worktreePath,
    agentRole: input.agentRole,
    providerId: input.providerId,
    modelId: input.modelId,
    sessionId: input.sessionId,
  })
}

async function skillRegistryRefresh(_project: Project, worktreePath: string): Promise<void> {
  const { skillRegistry } = await import('./skillRegistry')
  const { getRepoPath } = await import('../execution/executionConfig')
  const repoPath = getRepoPath()
  if (repoPath) {
    await skillRegistry.refreshSkills(repoPath)
    return
  }
  // Fallback: derive repo from worktree path (.agentos/worktrees)
  const marker = '/.agentos/worktrees'
  const idx = worktreePath.indexOf(marker)
  if (idx > 0) {
    await skillRegistry.refreshSkills(worktreePath.slice(0, idx))
  }
}
