/**
 * Run via: npx tsx src/runtime/planner/planSchema.test.ts
 */
import { InferenceError } from '../inference/types'
import { parsePlannerOutput } from './planSchema'

const VALID_PLAN = JSON.stringify({
  title: 'Task API',
  reasoning: 'Split into requirements, implementation, tests, and review.',
  epic: { title: 'Task API', description: 'REST API for task management' },
  tasks: [
    {
      title: 'Define API schema',
      role: 'planner',
      acceptanceCriteria: ['OpenAPI spec drafted'],
    },
    {
      title: 'Implement endpoints',
      role: 'builder',
      acceptanceCriteria: ['CRUD routes work'],
      dependsOnTitles: ['Define API schema'],
    },
    {
      title: 'Add integration tests',
      role: 'test-writer',
      acceptanceCriteria: ['Test suite passes'],
      dependsOnTitles: ['Implement endpoints'],
    },
  ],
})

function run() {
  const plan = parsePlannerOutput(VALID_PLAN)
  console.assert(plan.title === 'Task API', 'title parsed')
  console.assert(plan.tasks.length === 3, 'three tasks')
  console.assert(plan.tasks[1].dependsOnTitles?.[0] === 'Define API schema', 'dependency preserved')

  let threw = false
  try {
    parsePlannerOutput('{ "title": "x" }')
  } catch (err) {
    threw = err instanceof InferenceError && err.code === 'invalid_plan'
  }
  console.assert(threw, 'rejects incomplete plan')

  threw = false
  try {
    parsePlannerOutput(
      JSON.stringify({
        title: 'Cycle',
        reasoning: 'bad',
        epic: { title: 'E', description: 'D' },
        tasks: [
          { title: 'A', role: 'builder', acceptanceCriteria: ['a'], dependsOnTitles: ['B'] },
          { title: 'B', role: 'builder', acceptanceCriteria: ['b'], dependsOnTitles: ['A'] },
          { title: 'C', role: 'builder', acceptanceCriteria: ['c'] },
        ],
      }),
    )
  } catch (err) {
    threw = err instanceof InferenceError && err.message.includes('Circular')
  }
  console.assert(threw, 'rejects circular dependencies')

  console.log('planSchema.test.ts: all assertions passed')
}

run()
