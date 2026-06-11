import type { GovernanceMode } from '../../types/graph'

export interface GovernancePolicy {
  mode: GovernanceMode
  autoRunByDefault: boolean
  requiresHumanReviewApproval: boolean
  requiresHumanMergeApproval: boolean
}

const POLICIES: Record<GovernanceMode, GovernancePolicy> = {
  manual: {
    mode: 'manual',
    autoRunByDefault: false,
    requiresHumanReviewApproval: true,
    requiresHumanMergeApproval: true,
  },
  assisted: {
    mode: 'assisted',
    autoRunByDefault: true,
    requiresHumanReviewApproval: true,
    requiresHumanMergeApproval: true,
  },
  autonomous: {
    mode: 'autonomous',
    autoRunByDefault: true,
    requiresHumanReviewApproval: true,
    requiresHumanMergeApproval: false,
  },
  full_auto: {
    mode: 'full_auto',
    autoRunByDefault: true,
    requiresHumanReviewApproval: false,
    requiresHumanMergeApproval: false,
  },
}

export function getGovernancePolicy(mode: GovernanceMode): GovernancePolicy {
  return POLICIES[mode]
}

export function requiresHumanMergeApproval(mode: GovernanceMode): boolean {
  return getGovernancePolicy(mode).requiresHumanMergeApproval
}

export function requiresHumanReviewApproval(mode: GovernanceMode): boolean {
  return getGovernancePolicy(mode).requiresHumanReviewApproval
}

export function autoRunEnabledByDefault(mode: GovernanceMode): boolean {
  return getGovernancePolicy(mode).autoRunByDefault
}

export function shouldAutoActOnReviewerVerdict(
  mode: GovernanceMode,
  verdict: 'approve' | 'request_changes' | 'reject',
): boolean {
  if (mode === 'full_auto') {
    return verdict === 'approve' || verdict === 'reject'
  }
  if (mode === 'autonomous') {
    return verdict === 'approve'
  }
  return false
}

export function governanceModeLabel(mode: GovernanceMode): string {
  const labels: Record<GovernanceMode, string> = {
    manual: 'Manual',
    assisted: 'Assisted',
    autonomous: 'Autonomous',
    full_auto: 'Full Auto',
  }
  return labels[mode]
}
