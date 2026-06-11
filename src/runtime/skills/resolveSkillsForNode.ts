import type { GraphNode } from '../../types/graph'
import { getAgentForRole, getDefaultSkillIdsForRole, getSkillIdsFromNode } from './agentSkillBinding'
import { getNodeRole } from '../graphWorktree'
import { skillRegistry } from './skillRegistry'
import type { LoadedSkill } from './skillTypes'

export interface ResolveSkillsOptions {
  overrideSkillIds?: string[]
}

export function resolveSkillIdsForNode(
  node: GraphNode,
  options: ResolveSkillsOptions = {},
): string[] {
  if (options.overrideSkillIds?.length) {
    return options.overrideSkillIds
  }

  const fromNode = getSkillIdsFromNode(node)
  if (fromNode?.length) {
    return fromNode
  }

  const role = getNodeRole(node)
  const agent = getAgentForRole(role)
  if (agent?.skills.length) {
    return agent.skills
  }

  return getDefaultSkillIdsForRole(role)
}

export function resolveSkillsForNode(
  node: GraphNode,
  options: ResolveSkillsOptions = {},
): LoadedSkill[] {
  const ids = resolveSkillIdsForNode(node, options)
  const skills: LoadedSkill[] = []

  for (const id of ids) {
    const skill = skillRegistry.getSkill(id)
    if (skill) skills.push(skill)
  }

  return skills
}
