/**
 * Run via: npx tsx src/runtime/memory/formatMemoryBlock.test.ts
 */
import { formatMemoryBlock } from './formatMemoryBlock'
import type { AgentMemory } from '../../types/graph'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

const sample: AgentMemory[] = [
  {
    id: 'mem-1',
    projectId: 'proj-1',
    nodeId: 'node-1',
    agentRole: 'builder',
    memoryType: 'pattern',
    content: 'Task "Auth": used JWT middleware',
    tags: ['auth'],
    sourceEventId: null,
    createdAt: new Date().toISOString(),
  },
]

assert(formatMemoryBlock([]) === '', 'empty memories')
assert(formatMemoryBlock(sample).includes('Recalled project memory'), 'header present')
assert(formatMemoryBlock(sample).includes('[pattern]'), 'type present')

console.log('formatMemoryBlock.test.ts: all passed')
