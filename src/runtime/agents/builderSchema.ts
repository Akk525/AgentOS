import { InferenceError } from '../inference/types'

export interface BuilderFileOutput {
  path: string
  content: string
}

export interface BuilderOutput {
  summary: string
  files: BuilderFileOutput[]
  commands?: string[]
}

const MAX_FILES = 20
const MAX_FILE_BYTES = 512 * 1024

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateRelativePath(path: string): string {
  const trimmed = path.trim().replace(/^\/+/, '')
  if (!trimmed) {
    throw new InferenceError('invalid_plan', 'File path cannot be empty')
  }
  if (trimmed.includes('..')) {
    throw new InferenceError('invalid_plan', `Invalid file path: ${path}`)
  }
  return trimmed
}

export function parseBuilderOutput(raw: string): BuilderOutput {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new InferenceError('invalid_plan', 'Builder response is not valid JSON')
  }

  if (!isRecord(parsed)) {
    throw new InferenceError('invalid_plan', 'Builder response must be a JSON object')
  }

  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : ''
  if (!summary) {
    throw new InferenceError('invalid_plan', 'Builder summary is required')
  }

  if (!Array.isArray(parsed.files) || parsed.files.length === 0) {
    throw new InferenceError('invalid_plan', 'Builder must return at least one file')
  }
  if (parsed.files.length > MAX_FILES) {
    throw new InferenceError('invalid_plan', `Builder returned too many files (max ${MAX_FILES})`)
  }

  const files: BuilderFileOutput[] = parsed.files.map((file, index) => {
    if (!isRecord(file)) {
      throw new InferenceError('invalid_plan', `File at index ${index} must be an object`)
    }
    const path = validateRelativePath(String(file.path ?? ''))
    const content = typeof file.content === 'string' ? file.content : ''
    if (!content) {
      throw new InferenceError('invalid_plan', `File "${path}" has empty content`)
    }
    if (content.length > MAX_FILE_BYTES) {
      throw new InferenceError('invalid_plan', `File "${path}" exceeds max size`)
    }
    return { path, content }
  })

  const commands = Array.isArray(parsed.commands)
    ? parsed.commands.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    : undefined

  return { summary, files, commands }
}

export const BUILDER_SYSTEM_PROMPT = `You are a software builder agent for AgentOS.
Given a task with acceptance criteria, produce file changes as JSON only.

Output schema:
{
  "summary": "brief description of changes",
  "files": [{ "path": "relative/path/from/repo/root", "content": "full file content" }],
  "commands": ["optional allowlisted command after writes, e.g. npm test"]
}

Rules:
- Return complete file contents for each changed file.
- Use relative paths only (no leading slash, no .. segments).
- Prefer minimal, focused changes that satisfy acceptance criteria.
- commands must be allowlisted: git status, git diff, npm test, npm run test, pnpm test, yarn test, ls, pwd.
- Return JSON only, no markdown fences.`
