/**
 * Run via: npx tsx src/runtime/agents/builderSchema.test.ts
 */
import { InferenceError } from '../inference/types'
import { parseBuilderOutput } from './builderSchema'

const VALID = JSON.stringify({
  summary: 'Added auth middleware',
  files: [{ path: 'src/middleware.ts', content: 'export function auth() {}' }],
  commands: ['git status'],
})

function run() {
  const out = parseBuilderOutput(VALID)
  console.assert(out.summary.includes('middleware'), 'summary parsed')
  console.assert(out.files.length === 1, 'one file')
  console.assert(out.files[0].path === 'src/middleware.ts', 'path normalized')

  let threw = false
  try {
    parseBuilderOutput(JSON.stringify({ summary: 'x', files: [] }))
  } catch (err) {
    threw = err instanceof InferenceError
  }
  console.assert(threw, 'rejects empty files')

  threw = false
  try {
    parseBuilderOutput(JSON.stringify({
      summary: 'bad',
      files: [{ path: '../escape.ts', content: 'x' }],
    }))
  } catch (err) {
    threw = err instanceof InferenceError
  }
  console.assert(threw, 'rejects path traversal')

  console.log('builderSchema.test.ts: all assertions passed')
}

run()
