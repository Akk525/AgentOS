/**
 * Run via: npx tsx src/runtime/skills/resolveSkillsForNode.test.ts
 */
import { resolveSkillIdsForNode } from './resolveSkillsForNode'
import type { GraphNode } from '../../types/graph'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

const builderNode: GraphNode = {
  id: 'task-1',
  projectId: 'proj-1',
  type: 'task',
  parentId: null,
  title: 'Build feature',
  description: '',
  status: 'pending',
  acceptanceCriteria: [],
  assignedRole: 'builder',
  assignedSessionId: null,
  branch: null,
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const ids = resolveSkillIdsForNode(builderNode)
assert(ids.includes('skill-refactor'), 'builder gets default refactor skill')

const overrideNode: GraphNode = {
  ...builderNode,
  metadata: { skillIds: ['skill-fix-tests'] },
}
const overrideIds = resolveSkillIdsForNode(overrideNode)
assert(overrideIds[0] === 'skill-fix-tests', 'node metadata overrides defaults')

console.log('resolveSkillsForNode.test.ts: all passed')
