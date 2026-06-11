/**
 * Run via: npx tsx src/runtime/skills/skillLoopSchema.test.ts
 */
import { parseSkillLoopTurn } from './skillLoopSchema'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

const toolTurn = parseSkillLoopTurn(
  JSON.stringify({ action: 'tool_call', tool: 'read_file', args: { path: 'src/foo.ts' } }),
)
assert(toolTurn.action === 'tool_call', 'tool_call action')
if (toolTurn.action === 'tool_call') {
  assert(toolTurn.tool === 'read_file', 'tool name')
  assert(toolTurn.args.path === 'src/foo.ts', 'args path')
}

const finishTurn = parseSkillLoopTurn(
  JSON.stringify({ action: 'finish', summary: 'Done', context: 'Found auth bug' }),
)
assert(finishTurn.action === 'finish', 'finish action')
if (finishTurn.action === 'finish') {
  assert(finishTurn.summary === 'Done', 'summary')
  assert(finishTurn.context === 'Found auth bug', 'context')
}

console.log('skillLoopSchema.test.ts: all passed')
