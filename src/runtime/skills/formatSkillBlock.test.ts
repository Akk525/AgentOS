/**
 * Run via: npx tsx src/runtime/skills/formatSkillBlock.test.ts
 */
import { formatSkillBlock, formatSkillContextBlock } from './formatSkillBlock'
import type { LoadedSkill } from './skillTypes'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

const skill: LoadedSkill = {
  id: 'skill-test',
  name: 'Test',
  description: 'Test skill',
  body: 'Run tests first.',
  sourcePath: 'skills/test/SKILL.md',
  scope: 'bundled',
  tools: ['run_tests'],
}

assert(formatSkillBlock([]) === '', 'empty skills')
assert(formatSkillBlock([skill]).includes('Active skills'), 'header')
assert(formatSkillBlock([skill]).includes('Run tests first'), 'body')

const ctx = formatSkillContextBlock('Summary here', 'Context details')
assert(ctx.includes('Summary here'), 'summary in context block')
assert(ctx.includes('Context details'), 'context in block')

console.log('formatSkillBlock.test.ts: all passed')
