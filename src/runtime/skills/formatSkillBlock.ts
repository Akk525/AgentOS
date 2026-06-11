import type { LoadedSkill } from './skillTypes'

export function formatSkillBlock(skills: LoadedSkill[]): string {
  if (skills.length === 0) return ''

  const sections = skills.map(s => {
    const toolHint = s.tools.length > 0 ? `\nAllowed tools: ${s.tools.join(', ')}` : ''
    return `### Skill: ${s.name}\n${s.description}${toolHint}\n\n${s.body}`
  })

  return `## Active skills\n${sections.join('\n\n---\n\n')}`
}

export function formatSkillContextBlock(summary: string, context: string): string {
  const parts: string[] = ['## Skill execution context']
  if (summary.trim()) {
    parts.push(`Summary: ${summary.trim()}`)
  }
  if (context.trim()) {
    parts.push(context.trim())
  }
  return parts.join('\n\n')
}
