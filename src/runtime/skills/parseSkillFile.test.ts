/**
 * Run via: npx tsx src/runtime/skills/parseSkillFile.test.ts
 */
import { parseSkillFile } from './parseSkillFile'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

const sample = `---
name: test-skill
description: A test skill for unit tests
tools:
  - read_file
  - search_code
---

# Test Skill

Do the thing.
`

const parsed = parseSkillFile({
  content: sample,
  sourcePath: 'skills/test/SKILL.md',
  scope: 'bundled',
})

assert(parsed.id === 'skill-test-skill', 'id from name')
assert(parsed.name === 'test-skill', 'name')
assert(parsed.description === 'A test skill for unit tests', 'description')
assert(parsed.tools.includes('read_file'), 'read_file tool')
assert(parsed.body.includes('Do the thing'), 'body content')

try {
  parseSkillFile({ content: 'no frontmatter', sourcePath: 'x', scope: 'bundled' })
  assert(false, 'should throw on missing frontmatter')
} catch {
  // expected
}

console.log('parseSkillFile.test.ts: all passed')
