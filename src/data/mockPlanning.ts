import type {
  ActiveSession, RuntimePlan, PlanSubtask, RuntimeReasoning, RuntimeBlocker,
} from '../types'

const base = new Date('2026-05-17T10:01:00Z')
const t = (offsetSeconds: number) =>
  new Date(base.getTime() + offsetSeconds * 1000).toISOString()

// ── Planner session ───────────────────────────────────────────────────────────

export const mockPlannerSession: ActiveSession = {
  id: 'sess-006',
  taskTitle: 'Auth system refactor — delegation plan',
  agentId: 'agent-planner-01',
  agentName: 'Lyra',
  agentRole: 'planner',
  workspaceId: 'ws-001',
  workspaceName: 'boilerbyte',
  branch: 'plan/auth-refactor',
  providerId: 'anthropic',
  providerName: 'Anthropic',
  modelId: 'claude-opus-4-7',
  status: 'planning',
  startedAt: t(-600),
  patchVersion: 0,
  interventionCount: 0,
  tokensUsed: 8400,
  costUsd: 0.084,
  phase: 'autonomous_running',
}

// ── Subtasks ──────────────────────────────────────────────────────────────────

export const mockSubtasks: PlanSubtask[] = [
  {
    id: 'st-001',
    planId: 'plan-001',
    title: 'Fix token validation race condition',
    role: 'debugger',
    assignedSessionId: 'sess-001',
    assignedAgentName: 'Cipher',
    status: 'running',
    dependsOn: [],
    branch: 'fix/auth-race',
    patchVersion: 2,
    testsPassed: 94,
  },
  {
    id: 'st-002',
    planId: 'plan-001',
    title: 'Cleanup middleware layer',
    role: 'refactorer',
    assignedSessionId: 'sess-004',
    assignedAgentName: 'Rex',
    status: 'blocked',
    dependsOn: ['st-001'],
    branch: 'refactor/parser-v2',
  },
  {
    id: 'st-003',
    planId: 'plan-001',
    title: 'Regenerate test suite',
    role: 'test-writer',
    assignedSessionId: 'sess-003',
    assignedAgentName: 'Atlas',
    status: 'running',
    dependsOn: [],
    branch: 'test/payment-int',
    testsPassed: 0,
  },
  {
    id: 'st-004',
    planId: 'plan-001',
    title: 'Security audit of auth API',
    role: 'reviewer',
    assignedSessionId: 'sess-002',
    assignedAgentName: 'Echo',
    status: 'review',
    dependsOn: ['st-001'],
    branch: 'fix/auth-race',
  },
]

// ── Runtime plan ──────────────────────────────────────────────────────────────

export const mockRuntimePlans: RuntimePlan[] = [
  {
    id: 'plan-001',
    title: 'Authentication System Refactor',
    description: 'Decompose auth refactor into parallel workstreams, resolving race condition as critical path dependency.',
    plannerSessionId: 'sess-006',
    plannerName: 'Lyra',
    workspaceName: 'boilerbyte',
    createdAt: t(-300),
    status: 'active',
    subtasks: mockSubtasks,
    completedSubtasks: 0,
    reasoning: 'Token fix is critical path — 2 subtasks depend on it. Test regeneration parallelised independently. Reviewer assigned ahead of fix completion to minimise wait.',
  },
]

// ── Reasoning log ─────────────────────────────────────────────────────────────

export const mockReasoning: RuntimeReasoning[] = [
  {
    id: 'rr-001',
    timestamp: t(-300),
    decisionType: 'plan_created',
    planId: 'plan-001',
    explanation: 'Lyra decomposed "Auth System Refactor" into 4 subtasks — token fix identified as critical path dependency for middleware and security review.',
    severity: 'info',
  },
  {
    id: 'rr-002',
    timestamp: t(-290),
    decisionType: 'assignment',
    affectedAgentName: 'Cipher',
    affectedSessionId: 'sess-001',
    planId: 'plan-001',
    explanation: 'Cipher assigned to token-validation-fix — debugger role matches race condition failure pattern. Anthropic capacity available at assignment time (3/5).',
    severity: 'info',
  },
  {
    id: 'rr-003',
    timestamp: t(-285),
    decisionType: 'assignment',
    affectedAgentName: 'Atlas',
    affectedSessionId: 'sess-003',
    planId: 'plan-001',
    explanation: 'Atlas routed to OpenAI provider — Anthropic at 80% capacity. OpenAI had zero queue pressure. No delay to test-regeneration workstream.',
    severity: 'info',
  },
  {
    id: 'rr-004',
    timestamp: t(-280),
    decisionType: 'assignment',
    affectedAgentName: 'Echo',
    affectedSessionId: 'sess-002',
    planId: 'plan-001',
    explanation: 'Echo pre-assigned for security review — reviewer capacity confirmed available. Session queued to activate once token fix reaches ready_for_review.',
    severity: 'info',
  },
  {
    id: 'rr-005',
    timestamp: t(-240),
    decisionType: 'blocker_detected',
    affectedAgentName: 'Rex',
    affectedSessionId: 'sess-004',
    planId: 'plan-001',
    explanation: 'Middleware cleanup blocked — shared type exports in auth/types.ts cannot migrate before token fix merges. Refactor session paused to prevent type conflict.',
    severity: 'warning',
  },
  {
    id: 'rr-006',
    timestamp: t(-30),
    decisionType: 'queue',
    explanation: 'Security audit queued — Anthropic at 4/5 capacity. Estimated 45s delay before slot opens. Low severity: Echo session will activate automatically.',
    severity: 'warning',
  },
]

// ── Blockers ──────────────────────────────────────────────────────────────────

export const mockBlockers: RuntimeBlocker[] = [
  {
    id: 'blk-001',
    sessionId: 'sess-004',
    planSubtaskId: 'st-002',
    type: 'dependency',
    message: 'Middleware cleanup cannot proceed — depends on token-validation-fix (sess-001). Shared types in auth/types.ts are incompatible until fix merges.',
    detectedAt: t(-240),
    resolved: false,
    escalatedToHuman: false,
  },
  {
    id: 'blk-002',
    type: 'provider_overload',
    message: 'Anthropic provider at 4/5 capacity — new assignments queued or routed to OpenAI. Token throughput reduced ~15%.',
    detectedAt: t(-600),
    resolved: false,
    escalatedToHuman: false,
  },
  {
    id: 'blk-003',
    sessionId: 'sess-001',
    type: 'merge_conflict',
    message: 'Token refresh branch had merge conflict with main/src/auth — resolved automatically via planner rebase strategy.',
    detectedAt: t(-500),
    resolved: true,
    escalatedToHuman: false,
  },
]
