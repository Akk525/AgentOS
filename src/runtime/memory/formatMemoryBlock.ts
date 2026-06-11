import type { AgentMemory } from '../../types/graph'

export function formatMemoryBlock(memories: AgentMemory[]): string {
  if (memories.length === 0) return ''

  const lines = memories.map(m => {
    const tagHint = m.tags.length > 0 ? ` (${m.tags.slice(0, 3).join(', ')})` : ''
    return `- [${m.memoryType}] ${m.content}${tagHint}`
  })

  return `## Recalled project memory\n${lines.join('\n')}`
}
