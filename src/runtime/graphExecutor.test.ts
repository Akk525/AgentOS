/**
 * Manual / future vitest coverage for graphExecutor.
 * Run assertions via: npx tsx src/runtime/graphExecutor.test.ts (when tsx available)
 */
import { computeBlockedNodes, computeReadyNodes } from './graphExecutor'
import type { GraphEdge, GraphNode } from '../types/graph'

const nodes: GraphNode[] = [
  {
    id: 'st-001',
    projectId: 'p1',
    type: 'task',
    parentId: null,
    title: 'A',
    description: '',
    status: 'running',
    acceptanceCriteria: [],
    assignedRole: 'debugger',
    assignedSessionId: null,
    branch: null,
    metadata: {},
    createdAt: '1',
    updatedAt: '1',
  },
  {
    id: 'st-002',
    projectId: 'p1',
    type: 'task',
    parentId: null,
    title: 'B',
    description: '',
    status: 'blocked',
    acceptanceCriteria: [],
    assignedRole: 'refactorer',
    assignedSessionId: null,
    branch: null,
    metadata: {},
    createdAt: '1',
    updatedAt: '1',
  },
  {
    id: 'st-003',
    projectId: 'p1',
    type: 'task',
    parentId: null,
    title: 'C',
    description: '',
    status: 'pending',
    acceptanceCriteria: [],
    assignedRole: 'tester',
    assignedSessionId: null,
    branch: null,
    metadata: {},
    createdAt: '1',
    updatedAt: '1',
  },
]

const edges: GraphEdge[] = [
  { id: 'e1', projectId: 'p1', fromNodeId: 'st-002', toNodeId: 'st-001', edgeType: 'depends_on' },
]

export function runGraphExecutorTests(): void {
  const blocked = computeBlockedNodes(nodes, edges)
  if (!blocked.includes('st-002')) {
    throw new Error('st-002 should be blocked')
  }

  const ready = computeReadyNodes(
    nodes.map(n => (n.id === 'st-001' ? { ...n, status: 'done' as const } : n)),
    edges,
  )
  if (!ready.includes('st-002')) {
    throw new Error('st-002 should be ready when st-001 is done')
  }
  if (!ready.includes('st-003')) {
    throw new Error('st-003 should be ready (no deps)')
  }
}

