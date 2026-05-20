import type {
  ActiveSession, SessionDependency, RuntimeQueueEntry, RuntimeLoad,
  ReviewSession, ReviewComment, OrchestratorEvent,
} from '../types'

// ── Active sessions ───────────────────────────────────────────────────────────

export const mockActiveSessions: ActiveSession[] = [
  {
    id: 'sess-001',
    taskTitle: 'Fix auth token race condition',
    agentId: 'agent-debugger-01',
    agentName: 'Cipher',
    agentRole: 'debugger',
    workspaceId: 'ws-001',
    workspaceName: 'boilerbyte',
    branch: 'fix/auth-race',
    providerId: 'anthropic',
    providerName: 'Anthropic',
    modelId: 'claude-sonnet-4-6',
    status: 'running',
    startedAt: '2026-05-17T09:00:00Z',
    patchVersion: 2,
    interventionCount: 1,
    tokensUsed: 42800,
    costUsd: 0.214,
    phase: 'patch_updating',
    testsPassed: 94,
    testsFailed: 0,
  },
  {
    id: 'sess-002',
    taskTitle: 'Review auth patch — security audit',
    agentId: 'agent-reviewer-01',
    agentName: 'Echo',
    agentRole: 'reviewer',
    workspaceId: 'ws-001',
    workspaceName: 'boilerbyte',
    branch: 'fix/auth-race',
    providerId: 'anthropic',
    providerName: 'Anthropic',
    modelId: 'claude-opus-4-7',
    status: 'awaiting_review',
    startedAt: '2026-05-17T09:50:00Z',
    patchVersion: 2,
    interventionCount: 0,
    tokensUsed: 18200,
    costUsd: 0.182,
    phase: 'ready_for_review',
  },
  {
    id: 'sess-003',
    taskTitle: 'Write payment integration tests',
    agentId: 'agent-test-writer-01',
    agentName: 'Atlas',
    agentRole: 'test-writer',
    workspaceId: 'ws-001',
    workspaceName: 'boilerbyte',
    branch: 'test/payment-int',
    providerId: 'openai',
    providerName: 'OpenAI',
    modelId: 'gpt-4o',
    status: 'running',
    startedAt: '2026-05-17T09:15:00Z',
    patchVersion: 1,
    interventionCount: 0,
    tokensUsed: 34600,
    costUsd: 0.104,
    phase: 'autonomous_running',
    testsPassed: 0,
    testsFailed: 0,
  },
  {
    id: 'sess-004',
    taskTitle: 'Migrate parser to recursive descent',
    agentId: 'agent-refactorer-01',
    agentName: 'Rex',
    agentRole: 'refactorer',
    workspaceId: 'ws-002',
    workspaceName: 'clauseguard',
    branch: 'refactor/parser-v2',
    providerId: 'anthropic',
    providerName: 'Anthropic',
    modelId: 'claude-sonnet-4-6',
    status: 'blocked',
    startedAt: '2026-05-17T08:40:00Z',
    patchVersion: 1,
    interventionCount: 0,
    tokensUsed: 12400,
    costUsd: 0.062,
    phase: 'paused',
    blockReason: 'Waiting for auth patch merge — shared type definitions conflict',
  },
  {
    id: 'sess-005',
    taskTitle: 'Plan monorepo migration strategy',
    agentId: 'agent-architect-01',
    agentName: 'Nexus',
    agentRole: 'architect',
    workspaceId: 'ws-003',
    workspaceName: 'formula-os',
    branch: 'plan/monorepo',
    providerId: 'anthropic',
    providerName: 'Anthropic',
    modelId: 'claude-opus-4-7',
    status: 'running',
    startedAt: '2026-05-17T09:30:00Z',
    patchVersion: 1,
    interventionCount: 0,
    tokensUsed: 28900,
    costUsd: 0.289,
    phase: 'autonomous_running',
  },
]

// ── Dependencies ──────────────────────────────────────────────────────────────

export const mockDependencies: SessionDependency[] = [
  { fromId: 'sess-002', toId: 'sess-001', type: 'reviews'    },
  { fromId: 'sess-004', toId: 'sess-001', type: 'blocked_by' },
]

// ── Runtime queue ─────────────────────────────────────────────────────────────

export const mockRuntimeQueue: RuntimeQueueEntry[] = [
  {
    id: 'queue-001',
    taskTitle: 'Security audit — payment module',
    workspaceName: 'boilerbyte',
    agentName: 'Cipher',
    queuedAt: '2026-05-17T10:02:00Z',
    waitingFor: 'provider',
    estimatedWaitSeconds: 45,
    priority: 'high',
  },
  {
    id: 'queue-002',
    taskTitle: 'Add RSI momentum signals',
    workspaceName: 'quant-bot',
    agentName: 'Nova',
    queuedAt: '2026-05-17T10:05:00Z',
    waitingFor: 'runtime_capacity',
    estimatedWaitSeconds: 120,
    priority: 'normal',
  },
  {
    id: 'queue-003',
    taskTitle: 'Update CI pipeline for monorepo',
    workspaceName: 'formula-os',
    agentName: 'Atlas',
    queuedAt: '2026-05-17T10:08:00Z',
    waitingFor: 'dependency',
    estimatedWaitSeconds: 300,
    priority: 'low',
  },
]

// ── Runtime load ──────────────────────────────────────────────────────────────

export const initialRuntimeLoad: RuntimeLoad = {
  cpuPercent: 67,
  memoryMb: 4280,
  memoryMaxMb: 8192,
  activeSessions: 5,
  maxConcurrentSessions: 8,
  tokenThroughputPerSec: 2840,
  providerCapacity: {
    anthropic: { used: 4, max: 5 },
    openai:    { used: 1, max: 3 },
    ollama:    { used: 0, max: 2 },
  },
  queueDepth: 3,
}

// ── Review sessions ───────────────────────────────────────────────────────────

const now = new Date('2026-05-17T10:01:00Z')
const t = (offsetSeconds: number) =>
  new Date(now.getTime() + offsetSeconds * 1000).toISOString()

export const mockReviewComments: ReviewComment[] = [
  {
    id: 'cmt-001',
    sessionId: 'rev-001',
    author: 'Echo',
    type: 'warning',
    content: 'Race condition still possible in token refresh if refresh_token is null at line 44.',
    file: 'src/auth/tokenRefresh.ts',
    lineRange: '42–58',
    timestamp: t(0),
  },
  {
    id: 'cmt-002',
    sessionId: 'rev-001',
    author: 'Echo',
    type: 'suggestion',
    content: 'Consider a mutex lock pattern instead of setTimeout debounce — more deterministic under high concurrency.',
    file: 'src/auth/tokenRefresh.ts',
    lineRange: '44',
    timestamp: t(12),
  },
  {
    id: 'cmt-003',
    sessionId: 'rev-001',
    author: 'Echo',
    type: 'question',
    content: 'Why is the exponential backoff capped at 30s? Auth flows at scale may need a longer ceiling.',
    file: 'src/auth/retryPolicy.ts',
    lineRange: '18',
    timestamp: t(28),
  },
]

export const mockReviewSessions: ReviewSession[] = [
  {
    id: 'rev-001',
    patchSessionId: 'sess-001',
    reviewerAgentId: 'agent-reviewer-01',
    reviewerName: 'Echo',
    status: 'running',
    comments: mockReviewComments.slice(0, 2),
    assignedAt: t(-60),
  },
]

// ── Orchestration timeline ────────────────────────────────────────────────────

export const mockOrchestratorTimeline: OrchestratorEvent[] = [
  {
    id: 'oe-001', sessionId: 'sess-005', agentName: 'Nexus',
    workspaceName: 'formula-os', type: 'session_started',
    message: 'Nexus started planning monorepo migration on formula-os',
    timestamp: t(-1800), severity: 'info',
  },
  {
    id: 'oe-002', sessionId: 'sess-003', agentName: 'Atlas',
    workspaceName: 'boilerbyte', type: 'session_started',
    message: 'Atlas started writing payment integration tests',
    timestamp: t(-1620), severity: 'info',
  },
  {
    id: 'oe-003', sessionId: 'sess-001', agentName: 'Cipher',
    workspaceName: 'boilerbyte', type: 'patch_updated',
    message: 'Cipher updated patch to v2 — rewrote token refresh mutex',
    timestamp: t(-900), severity: 'success',
  },
  {
    id: 'oe-004', sessionId: 'sess-001', agentName: 'Cipher',
    workspaceName: 'boilerbyte', type: 'tests_passed',
    message: '94 tests passed after patch v2',
    timestamp: t(-840), severity: 'success',
  },
  {
    id: 'oe-005', sessionId: 'sess-004', agentName: 'Rex',
    workspaceName: 'clauseguard', type: 'session_blocked',
    message: 'Rex session blocked — auth type conflict with boilerbyte/main',
    timestamp: t(-780), severity: 'warning',
  },
  {
    id: 'oe-006', type: 'provider_load',
    message: 'Anthropic provider at 80% capacity — 1 session queued',
    timestamp: t(-600), severity: 'warning',
  },
  {
    id: 'oe-007', sessionId: 'sess-002', agentName: 'Echo',
    workspaceName: 'boilerbyte', type: 'review_assigned',
    message: 'Echo assigned to review auth patch — security audit',
    timestamp: t(-300), severity: 'info',
  },
  {
    id: 'oe-008', sessionId: 'sess-002', agentName: 'Echo',
    workspaceName: 'boilerbyte', type: 'review_comment',
    message: 'Echo flagged race condition in tokenRefresh.ts:42–58',
    timestamp: t(-60), severity: 'warning',
  },
  {
    id: 'oe-009', type: 'session_queued',
    message: 'Security audit session queued — Anthropic at capacity',
    timestamp: t(-30), severity: 'warning',
  },
]
