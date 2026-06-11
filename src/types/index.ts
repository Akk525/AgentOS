export type TaskStatus =
  | 'backlog'
  | 'claimed'
  | 'running'
  | 'review'
  | 'needs_changes'
  | 'done'
  | 'failed'

export type TestStatus = 'passing' | 'failing' | 'pending' | 'skipped'

export type AgentStatus = 'idle' | 'running' | 'paused' | 'error'

export type ProviderStatus = 'connected' | 'disconnected' | 'error' | 'unconfigured'

export type PermissionLevel = 'read' | 'write' | 'execute' | 'admin'

export type SessionMode =
  | 'autonomous'
  | 'paused'
  | 'human_controlled'
  | 'awaiting_input'
  | 'initializing'

export type RuntimePhase =
  | 'autonomous_running'
  | 'human_controlled'
  | 'paused'
  | 'agent_replanning'
  | 'patch_updating'
  | 'tests_rerunning'
  | 'ready_for_review'

export type TestRunState = 'idle' | 'running' | 'passed' | 'failed'

export type TraceActor = 'agent' | 'human' | 'system'

export type TraceEventType =
  | 'read_file'
  | 'search_code'
  | 'run_tests'
  | 'edit_file'
  | 'run_command'
  | 'create_file'
  | 'delete_file'
  | 'submit_review'
  | 'fetch_context'
  | 'generate_summary'
  | 'tool_call'
  | 'human_instruction'
  | 'human_takeover'
  | 'human_return'
  | 'agent_acknowledged'
  | 'agent_replanned'
  | 'patch_updated'
  | 'review_refreshed'
  | 'system_event'

export interface Task {
  id: string
  title: string
  description: string
  repo: string
  branch: string
  worktree?: string
  assignedAgentId: string
  assignedRole?: string
  assignedAgentName?: string
  model: string
  provider: string
  status: TaskStatus
  createdAt: string
  startedAt?: string
  completedAt?: string
  runtimeSeconds?: number
  testStatus?: TestStatus
  testsPassed?: number
  testsFailed?: number
  confidenceScore?: number
  riskScore?: number
  filesChanged?: string[]
  linesAdded?: number
  linesRemoved?: number
  completionNote?: string
  tags?: string[]
  priority?: 'low' | 'medium' | 'high' | 'critical'
  tokensUsed?: number
  costUsd?: number
  mergeConflict?: boolean
  blockReason?: string
  parentId?: string | null
  epicCostUsd?: number
}

export interface Agent {
  id: string
  name: string
  description: string
  role: 'debugger' | 'reviewer' | 'test-writer' | 'refactorer' | 'architect' | 'general'
  provider: string
  model: string
  tools: string[]
  permissionLevel: PermissionLevel
  skills: string[]
  temperature: number
  status: AgentStatus
  tasksCompleted: number
  successRate: number
  avgRuntimeMinutes: number
  avatar?: string
}

export interface Provider {
  id: string
  name: string
  status: ProviderStatus
  baseUrl: string
  defaultModel: string
  models: string[]
  apiKeySet: boolean
  latencyMs?: number
  requestsToday?: number
  costToday?: number
}

export interface Skill {
  id: string
  name: string
  description: string
  category: 'testing' | 'refactoring' | 'review' | 'documentation' | 'analysis' | 'generation'
  steps: string[]
  usageCount: number
  avgDurationMinutes: number
  requiredTools: string[]
  tags: string[]
}

export interface TraceEvent {
  id: string
  type: TraceEventType
  actor?: TraceActor
  timestamp: string
  label: string
  detail?: string
  durationMs?: number
  success?: boolean
  tokenCount?: number
  retryCount?: number
  metadata?: Record<string, unknown>
}

export interface AgentCompletionNote {
  summary: string
  whatChanged: string[]
  whyItChanged: string
  testsRun: number
  testsPassed: number
  testsFailed: number
  unresolvedRisks: string[]
  confidence: number
  tokensUsed?: number
  costUsd?: number
  runtimeSeconds?: number
}

export interface RuntimeMetrics {
  tokensPerSec: number
  contextWindowPct: number
  activePhase: string
  currentObjective: string
  runtimeHealth: 'good' | 'degraded' | 'error'
}

// ── Workspace ─────────────────────────────────────────────────────────────────

export type WorktreeStatus = 'active' | 'idle' | 'stale' | 'error'
export type WorkspaceHealth = 'healthy' | 'degraded' | 'error' | 'offline'

export interface WorktreeEntry {
  id: string
  branch: string
  path: string
  assignedAgentId?: string
  taskId?: string
  status: WorktreeStatus
  interventionCount: number
}

export interface Workspace {
  id: string
  name: string
  repo: string
  rootPath: string
  worktrees: WorktreeEntry[]
  provider: string
  model: string
  healthStatus: WorkspaceHealth
  lastActivity: string
  activeSessions: number
  totalTasks: number
}

// ── Permissions ───────────────────────────────────────────────────────────────

export type PermissionStatus = 'allowed' | 'require_confirmation' | 'denied'
export type PermissionRisk = 'low' | 'medium' | 'high' | 'critical'
export type PermissionCategory = 'filesystem' | 'shell' | 'git' | 'network' | 'package' | 'tests'

export interface Permission {
  id: string
  label: string
  description: string
  status: PermissionStatus
  riskLevel: PermissionRisk
  category: PermissionCategory
}

// ── Runtime Notifications ─────────────────────────────────────────────────────

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface RuntimeNotification {
  id: string
  type: NotificationType
  title: string
  message?: string
  timestamp: string
}

// ── Provider Health ───────────────────────────────────────────────────────────

export type ProviderConnectionState =
  | 'connected'
  | 'connecting'
  | 'unreachable'
  | 'unauthorized'
  | 'latency_high'
  | 'degraded'
  | 'unconfigured'

export interface ProviderHealth {
  providerId: string
  name: string
  endpoint: string
  state: ProviderConnectionState
  latencyMs: number | null
  discoveredModels: string[]
  lastPingedAt: string
  errorMessage?: string
  apiKeyPresent: boolean
}

// ── Repo Validation ───────────────────────────────────────────────────────────

export type RepoValidationState = 'idle' | 'checking' | 'valid_git' | 'no_git' | 'invalid_path' | 'already_mounted'

export interface RepoValidationResult {
  path: string
  state: RepoValidationState
  message: string
  branch?: string
  isDirty?: boolean
  untrackedCount?: number
}

// ── Runtime Logs ──────────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogSource = 'daemon' | 'provider' | 'workspace' | 'bridge' | 'runtime' | 'agent' | 'terminal'

export interface RuntimeLogEntry {
  id: string
  level: LogLevel
  source: LogSource
  message: string
  timestamp: string
  meta?: Record<string, string | number | boolean>
}

// ── Terminal Bridge ───────────────────────────────────────────────────────────

export interface TerminalBridgeSession {
  id: string
  workspaceId: string
  pid?: number
  cols: number
  rows: number
  status: 'starting' | 'active' | 'terminated'
  startedAt: string
}

// ── Runtime Daemon ────────────────────────────────────────────────────────────

export type DaemonStatus = 'starting' | 'connected' | 'reconnecting' | 'stopped' | 'error'

export interface RuntimeDaemonState {
  status: DaemonStatus
  version: string
  uptimeSeconds: number
  memoryMb: number
  cpuPercent: number
  activeSessions: number
  eventThroughput: number
  filesystemMounted: boolean
  sandboxStatus: 'healthy' | 'degraded' | 'unavailable'
  dockerAvailable: boolean
  ollamaDetected: boolean
  providerStatuses: Record<string, 'connected' | 'connecting' | 'disconnected' | 'error'>
}

// ── Workspace Mount ───────────────────────────────────────────────────────────

export type MountState = 'mounting' | 'mounted' | 'unmounting' | 'unmounted' | 'error'

export interface WorkspaceMountStatus {
  workspaceId: string
  localPath: string
  mountState: MountState
  filesystemAccess: boolean
  terminalAvailable: boolean
  sandboxStatus: 'healthy' | 'degraded' | 'unavailable'
  attachedProviderId: string | null
}

// ── Permission Escalation ─────────────────────────────────────────────────────

export interface PermissionEscalation {
  id: string
  agentId: string
  agentName: string
  workspaceId: string
  workspaceName: string
  command: string
  riskLevel: 'high' | 'critical'
  riskExplanation: string
  permissionId: string
  requestedAt: string
}

// ── Session Archive ───────────────────────────────────────────────────────────

export type SessionOutcome = 'completed' | 'failed' | 'abandoned' | 'in_review'

export interface SessionArchive {
  id: string
  taskTitle: string
  agentName: string
  workspaceName: string
  branch: string
  startedAt: string
  endedAt: string
  durationSeconds: number
  outcome: SessionOutcome
  interventionCount: number
  tokensUsed: number
  costUsd: number
  patchVersion: number
  testsPassed: number
}

// ── Provider Capability ───────────────────────────────────────────────────────

export type ProviderConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error' | 'unconfigured'

export interface ProviderCapability {
  id: string
  name: string
  type: 'anthropic' | 'openai' | 'ollama' | 'vllm' | 'local'
  connectionStatus: ProviderConnectionStatus
  latencyMs: number | null
  modelsAvailable: string[]
  localDetected: boolean
  endpoint: string
  apiKeyConfigured: boolean
  lastChecked: string
}

// ── Multi-session Orchestration ───────────────────────────────────────────────

export type OrchestratedSessionStatus =
  | 'queued'
  | 'initializing'
  | 'running'
  | 'blocked'
  | 'awaiting_review'
  | 'reviewing'
  | 'completed'
  | 'failed'
  | 'planning'

export type SessionDependencyType = 'reviews' | 'blocked_by' | 'depends_on' | 'attached_to'

export interface ActiveSession {
  id: string
  taskTitle: string
  agentId: string
  agentName: string
  agentRole: string
  workspaceId: string
  workspaceName: string
  branch: string
  providerId: string
  providerName: string
  modelId: string
  status: OrchestratedSessionStatus
  startedAt: string
  patchVersion: number
  interventionCount: number
  tokensUsed: number
  costUsd: number
  phase: RuntimePhase
  blockReason?: string
  testsPassed?: number
  testsFailed?: number
}

export interface SessionDependency {
  fromId: string
  toId: string
  type: SessionDependencyType
}

export interface RuntimeQueueEntry {
  id: string
  taskTitle: string
  workspaceName: string
  agentName: string
  queuedAt: string
  waitingFor: 'provider' | 'runtime_capacity' | 'dependency'
  estimatedWaitSeconds: number
  priority: 'low' | 'normal' | 'high'
}

export interface ProviderCapacityEntry {
  used: number
  max: number
}

export interface RuntimeLoad {
  cpuPercent: number
  memoryMb: number
  memoryMaxMb: number
  activeSessions: number
  maxConcurrentSessions: number
  tokenThroughputPerSec: number
  providerCapacity: Record<string, ProviderCapacityEntry>
  queueDepth: number
}

export type ReviewCommentType = 'suggestion' | 'warning' | 'approval' | 'rejection' | 'question'

export interface ReviewComment {
  id: string
  sessionId: string
  author: string
  type: ReviewCommentType
  content: string
  file?: string
  lineRange?: string
  timestamp: string
}

export interface ReviewSession {
  id: string
  patchSessionId: string
  reviewerAgentId: string
  reviewerName: string
  status: 'assigned' | 'running' | 'completed' | 'approved' | 'rejected'
  comments: ReviewComment[]
  verdict?: 'approved' | 'approved_with_changes' | 'rejected'
  assignedAt: string
  completedAt?: string
}

export type OrchestratorEventType =
  | 'session_started'
  | 'patch_updated'
  | 'tests_passed'
  | 'tests_failed'
  | 'review_assigned'
  | 'review_comment'
  | 'review_approved'
  | 'session_blocked'
  | 'session_completed'
  | 'provider_load'
  | 'session_queued'
  | 'merge_conflict'
  | 'merge_completed'
  | 'plan_created'
  | 'usage_recorded'
  | 'merge_conflict_fix_spawned'
  | 'test_failure_fix_spawned'
  | 'subtask_assigned'
  | 'blocker_detected'
  | 'blocker_resolved'
  | 'escalated'

export type OrchestratorEventSeverity = 'info' | 'warning' | 'success' | 'error'

export interface OrchestratorEvent {
  id: string
  sessionId?: string
  nodeId?: string
  agentName?: string
  workspaceName?: string
  type: OrchestratorEventType
  message: string
  timestamp: string
  severity: OrchestratorEventSeverity
  payload?: Record<string, unknown>
}

// ── v1.0 — Planning + Delegation ─────────────────────────────────────────────

export type PlanSubtaskStatus = 'pending' | 'assigned' | 'running' | 'review' | 'done' | 'blocked'
export type PlanStatus = 'planning' | 'active' | 'blocked' | 'completed'

export interface PlanSubtask {
  id: string
  planId: string
  title: string
  role: string
  assignedSessionId?: string
  assignedAgentName?: string
  status: PlanSubtaskStatus
  dependsOn: string[]
  branch?: string
  patchVersion?: number
  testsPassed?: number
}

export interface RuntimePlan {
  id: string
  title: string
  description: string
  plannerSessionId: string
  plannerName: string
  workspaceName: string
  createdAt: string
  status: PlanStatus
  subtasks: PlanSubtask[]
  completedSubtasks: number
  reasoning: string
}

export type ReasoningDecisionType =
  | 'plan_created'
  | 'assignment'
  | 'queue'
  | 'escalation'
  | 'provider_reassign'
  | 'blocker_detected'
  | 'blocker_resolved'
  | 'human_override'

export interface RuntimeReasoning {
  id: string
  timestamp: string
  decisionType: ReasoningDecisionType
  affectedSessionId?: string
  affectedAgentName?: string
  planId?: string
  explanation: string
  severity: 'info' | 'warning' | 'critical'
}

export type BlockerType =
  | 'dependency'
  | 'merge_conflict'
  | 'provider_overload'
  | 'permission_required'
  | 'stalled'
  | 'review_timeout'

export interface RuntimeBlocker {
  id: string
  sessionId?: string
  planSubtaskId?: string
  type: BlockerType
  message: string
  detectedAt: string
  resolved: boolean
  escalatedToHuman: boolean
}

// ── Patch Lifecycle ───────────────────────────────────────────────────────────

export type PatchLifecycleState =
  | 'draft'
  | 'updating'
  | 'testing'
  | 'awaiting_review'
  | 'approved'
  | 'rejected'
  | 'archived'

export interface PatchLifecycle {
  sessionId: string
  workspaceId: string
  workspaceName: string
  branch: string
  worktreeId: string
  version: number
  state: PatchLifecycleState
  filesChanged: string[]
  testsPassed: number
  testsFailed: number
  interventionCount: number
  providerId: string
  agentName: string
  executionDurationMs: number
  tokensUsed: number
  costUsd: number
  updatedAt: string
}

// ── Session Launch ────────────────────────────────────────────────────────────

export interface SessionLaunchConfig {
  workspaceId: string
  workspaceName: string
  rootPath: string
  branchName: string
  agentId: string
  agentName: string
  providerId: string
  providerName: string
  modelId: string
  skillId?: string
}

export type LaunchStepStatus = 'pending' | 'running' | 'done' | 'error'

export interface SessionLaunchStep {
  id: string
  label: string
  status: LaunchStepStatus
  detail?: string
}

// ── Live Worktrees ────────────────────────────────────────────────────────────

export interface LiveWorktree {
  id: string
  workspaceId: string
  workspaceName: string
  branch: string
  sessionId?: string
  agentId?: string
  agentName?: string
  providerId: string
  status: 'creating' | 'active' | 'idle' | 'archived'
  createdAt: string
  patchState: PatchLifecycleState
  openReviews: number
}

// ── Workspace History ─────────────────────────────────────────────────────────

export interface WorkspaceHistory {
  workspaceId: string
  workspaceName: string
  lastMountedAt: string
  sessionCount: number
  recentBranches: string[]
  totalPatchesApplied: number
  lastOutcome?: SessionOutcome
}

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
  output?: string
  durationMs: number
  timestamp: string
  success: boolean
}

export interface TestResult {
  file: string
  suite: string
  passed: number
  failed: number
  skipped: number
  durationMs: number
  failures?: { name: string; message: string }[]
}

export interface DiffFile {
  path: string
  additions: number
  deletions: number
  chunks: DiffChunk[]
}

export interface DiffChunk {
  header: string
  lines: DiffLine[]
}

export interface DiffLine {
  type: 'add' | 'remove' | 'context'
  content: string
  lineNumber?: number
}

export interface SessionData {
  taskId: string
  events: TraceEvent[]
  toolCalls: ToolCall[]
  testResults: TestResult[]
  diff: DiffFile[]
  terminalOutput: string[]
  completionNote?: AgentCompletionNote
  totalTokens?: number
  totalCostUsd?: number
}

export * from './graph'
