/**
 * Run via: npx tsx src/runtime/governance/governancePolicy.test.ts
 */
import {
  autoRunEnabledByDefault,
  getGovernancePolicy,
  requiresHumanMergeApproval,
  shouldAutoActOnReviewerVerdict,
} from './governancePolicy'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

export function runGovernancePolicyTests(): void {
  assert(!autoRunEnabledByDefault('manual'), 'manual should not auto-run')
  assert(autoRunEnabledByDefault('assisted'), 'assisted should auto-run')
  assert(requiresHumanMergeApproval('assisted'), 'assisted needs human merge')
  assert(!requiresHumanMergeApproval('autonomous'), 'autonomous auto-merges')
  assert(getGovernancePolicy('full_auto').requiresHumanReviewApproval === false, 'full_auto skips human review')

  assert(shouldAutoActOnReviewerVerdict('autonomous', 'approve'), 'autonomous auto on approve')
  assert(!shouldAutoActOnReviewerVerdict('assisted', 'approve'), 'assisted waits for human')
  assert(shouldAutoActOnReviewerVerdict('full_auto', 'reject'), 'full_auto auto on reject')
}

export function run(): void {
  runGovernancePolicyTests()
  console.log('governancePolicy.test.ts: all passed')
}

run()
