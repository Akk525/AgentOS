import { mockAgents } from '../../data/mockAgents'
import type { GraphNode } from '../../types/graph'

export const ROLE_DEFAULT_AGENT: Record<string, string> = {
  builder: 'agent-refactorer-01',
  reviewer: 'agent-reviewer-01',
  'test-writer': 'agent-test-writer-01',
}

export const ROLE_DEFAULT_SKILLS: Record<string, string[]> = {
  builder: ['skill-refactor'],
  reviewer: ['skill-review-pr'],
  'test-writer': ['skill-fix-tests'],
}

export function getAgentForRole(role: string) {
  const agentId = ROLE_DEFAULT_AGENT[role]
  if (agentId) {
    return mockAgents.find(a => a.id === agentId)
  }
  return mockAgents.find(a => a.role === role)
}

export function getDefaultSkillIdsForRole(role: string): string[] {
  return ROLE_DEFAULT_SKILLS[role] ?? []
}

export function getSkillIdsFromNode(node: GraphNode): string[] | undefined {
  const meta = node.metadata as Record<string, unknown>
  if (Array.isArray(meta.skillIds)) {
    return meta.skillIds.filter((id): id is string => typeof id === 'string')
  }
  if (typeof meta.skillId === 'string') {
    return [meta.skillId]
  }
  return undefined
}
