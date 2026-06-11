import { mockAgents } from '../data/mockAgents'
import type { Agent, Task } from '../types'

const GRAPH_ROLE_MAP: Record<string, Agent['role']> = {
  planner: 'architect',
  builder: 'general',
  debugger: 'debugger',
  reviewer: 'reviewer',
  'test-writer': 'test-writer',
  refactorer: 'refactorer',
  architect: 'architect',
  general: 'general',
}

export function mapGraphRoleToAgentRole(role: string): Agent['role'] {
  return GRAPH_ROLE_MAP[role] ?? 'general'
}

function formatRoleName(role: string): string {
  return role
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function getTaskAgentDisplay(task: Task): { role: Agent['role']; name: string; status: Agent['status'] } {
  const mock = mockAgents.find(a => a.id === task.assignedAgentId)
  if (mock) {
    return { role: mock.role, name: mock.name, status: mock.status }
  }

  const role = mapGraphRoleToAgentRole(task.assignedRole ?? 'general')
  const name = task.assignedAgentName ?? formatRoleName(task.assignedRole ?? 'agent')
  const status: Agent['status'] =
    task.status === 'running' ? 'running'
    : task.status === 'failed' ? 'error'
    : 'idle'

  return { role, name, status }
}
