import { parse as parseYaml } from 'yaml'
import type { LoadedSkill, SkillScope, SkillToolName } from './skillTypes'

const VALID_TOOLS = new Set<SkillToolName>([
  'read_file',
  'search_code',
  'get_git_diff',
  'fetch_context',
  'run_tests',
  'edit_file',
  'create_file',
  'run_command',
])

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseTools(raw: unknown): SkillToolName[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((t): t is SkillToolName => typeof t === 'string' && VALID_TOOLS.has(t as SkillToolName))
}

export interface ParseSkillInput {
  content: string
  id?: string
  sourcePath: string
  scope: SkillScope
}

export function parseSkillFile(input: ParseSkillInput): LoadedSkill {
  const { content, sourcePath, scope } = input
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) {
    throw new Error(`Invalid SKILL.md (missing frontmatter): ${sourcePath}`)
  }

  const frontmatter = parseYaml(match[1]) as Record<string, unknown> | null
  if (!frontmatter || typeof frontmatter !== 'object') {
    throw new Error(`Invalid SKILL.md frontmatter: ${sourcePath}`)
  }

  const name = typeof frontmatter.name === 'string' ? frontmatter.name.trim() : ''
  const description = typeof frontmatter.description === 'string' ? frontmatter.description.trim() : ''
  if (!name || !description) {
    throw new Error(`SKILL.md requires name and description: ${sourcePath}`)
  }

  const id = input.id ?? `skill-${slugify(name)}`
  const body = match[2].trim()
  const tools = parseTools(frontmatter.tools)

  return {
    id,
    name,
    description,
    body,
    sourcePath,
    scope,
    tools,
  }
}
