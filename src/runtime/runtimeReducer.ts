import type {
  SessionMode, RuntimePhase, TestRunState,
  TraceEvent, AgentCompletionNote, RuntimeMetrics, RuntimeNotification,
  RuntimeDaemonState, WorkspaceMountStatus, PermissionEscalation,
  ProviderHealth, RuntimeLogEntry, LiveWorktree, PatchLifecycle, WorkspaceHistory,
} from '../types'
import type { RuntimeConnectionStatus } from './runtimeTypes'
import { defaultMetrics } from './runtimeMockData'

// ── State ─────────────────────────────────────────────────────────────────────

export interface RuntimeState {
  sessionMode: SessionMode
  runtimePhase: RuntimePhase
  activeTaskId: string | null
  injectedEvents: TraceEvent[]
  metrics: RuntimeMetrics
  testRunState: TestRunState
  patchVersion: number
  interventionCount: number
  reviewRefreshedAt: string | null
  liveTerminalLines: string[]
  updatedCompletionNote: AgentCompletionNote | null
  connectionStatus: RuntimeConnectionStatus
  notifications: RuntimeNotification[]
  daemonState: RuntimeDaemonState | null
  mountedWorkspaces: WorkspaceMountStatus[]
  pendingEscalation: PermissionEscalation | null
  providerHealth: Record<string, ProviderHealth>
  runtimeLogs: RuntimeLogEntry[]
  liveWorktrees: LiveWorktree[]
  patchLifecycle: PatchLifecycle | null
  workspaceHistory: WorkspaceHistory[]
  gitDiff: string | null
  lastWorktreeError: string | null
  commandRunning: boolean
}

// ── Actions ───────────────────────────────────────────────────────────────────

export type RuntimeAction =
  | { type: 'SET_SESSION_MODE'; payload: SessionMode }
  | { type: 'SET_PHASE'; payload: RuntimePhase }
  | { type: 'SET_ACTIVE_TASK'; payload: string | null }
  | { type: 'ADD_EVENT'; payload: TraceEvent }
  | { type: 'CLEAR_EVENTS' }
  | { type: 'PATCH_UPDATED' }
  | { type: 'TEST_RUN_STARTED' }
  | { type: 'TEST_RUN_COMPLETE'; payload: { passed: boolean } }
  | { type: 'REVIEW_REFRESHED'; payload: { note: AgentCompletionNote } }
  | { type: 'APPEND_TERMINAL_LINES'; payload: string[] }
  | { type: 'INCREMENT_INTERVENTION' }
  | { type: 'SET_CONNECTION'; payload: RuntimeConnectionStatus }
  | { type: 'ADD_NOTIFICATION'; payload: RuntimeNotification }
  | { type: 'DISMISS_NOTIFICATION'; payload: string }
  | { type: 'SET_DAEMON_STATE'; payload: RuntimeDaemonState }
  | { type: 'UPDATE_MOUNT'; payload: WorkspaceMountStatus }
  | { type: 'SET_PENDING_ESCALATION'; payload: PermissionEscalation | null }
  | { type: 'UPDATE_PROVIDER_HEALTH'; payload: ProviderHealth }
  | { type: 'APPEND_LOG'; payload: RuntimeLogEntry }
  | { type: 'ADD_LIVE_WORKTREE'; payload: LiveWorktree }
  | { type: 'UPDATE_LIVE_WORKTREE'; payload: Partial<LiveWorktree> & { id: string } }
  | { type: 'SET_PATCH_LIFECYCLE'; payload: PatchLifecycle | null }
  | { type: 'UPDATE_WORKSPACE_HISTORY'; payload: WorkspaceHistory }
  | { type: 'SET_GIT_DIFF'; payload: string | null }
  | { type: 'SET_WORKTREE_ERROR'; payload: string | null }
  | { type: 'SET_COMMAND_RUNNING'; payload: boolean }

// ── Initial state ─────────────────────────────────────────────────────────────

export const initialState: RuntimeState = {
  sessionMode: 'autonomous',
  runtimePhase: 'autonomous_running',
  activeTaskId: null,
  injectedEvents: [],
  metrics: defaultMetrics,
  testRunState: 'idle',
  patchVersion: 1,
  interventionCount: 0,
  reviewRefreshedAt: null,
  liveTerminalLines: [],
  updatedCompletionNote: null,
  connectionStatus: 'connecting',
  notifications: [],
  daemonState: null,
  mountedWorkspaces: [],
  pendingEscalation: null,
  providerHealth: {},
  runtimeLogs: [],
  liveWorktrees: [],
  patchLifecycle: null,
  workspaceHistory: [],
  gitDiff: null,
  lastWorktreeError: null,
  commandRunning: false,
}

// ── Reducer ───────────────────────────────────────────────────────────────────

export function runtimeReducer(state: RuntimeState, action: RuntimeAction): RuntimeState {
  switch (action.type) {
    case 'SET_SESSION_MODE':       return { ...state, sessionMode: action.payload }
    case 'SET_PHASE':              return { ...state, runtimePhase: action.payload }
    case 'SET_ACTIVE_TASK':        return { ...state, activeTaskId: action.payload }
    case 'ADD_EVENT':              return { ...state, injectedEvents: [...state.injectedEvents, action.payload] }
    case 'CLEAR_EVENTS':           return { ...state, injectedEvents: [] }
    case 'PATCH_UPDATED':          return { ...state, patchVersion: state.patchVersion + 1 }
    case 'TEST_RUN_STARTED':       return { ...state, testRunState: 'running' }
    case 'TEST_RUN_COMPLETE':      return { ...state, testRunState: action.payload.passed ? 'passed' : 'failed' }
    case 'INCREMENT_INTERVENTION': return { ...state, interventionCount: state.interventionCount + 1 }
    case 'SET_CONNECTION':         return { ...state, connectionStatus: action.payload }
    case 'SET_DAEMON_STATE':       return { ...state, daemonState: action.payload }
    case 'SET_PENDING_ESCALATION': return { ...state, pendingEscalation: action.payload }
    case 'APPEND_TERMINAL_LINES':
      return { ...state, liveTerminalLines: [...state.liveTerminalLines, ...action.payload] }
    case 'REVIEW_REFRESHED':
      return { ...state, reviewRefreshedAt: new Date().toISOString(), updatedCompletionNote: action.payload.note }
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [...state.notifications, action.payload].slice(-8) }
    case 'DISMISS_NOTIFICATION':
      return { ...state, notifications: state.notifications.filter(n => n.id !== action.payload) }
    case 'UPDATE_MOUNT': {
      const rest = state.mountedWorkspaces.filter(m => m.workspaceId !== action.payload.workspaceId)
      return { ...state, mountedWorkspaces: [...rest, action.payload] }
    }
    case 'UPDATE_PROVIDER_HEALTH':
      return {
        ...state,
        providerHealth: { ...state.providerHealth, [action.payload.providerId]: action.payload },
      }
    case 'APPEND_LOG':
      return {
        ...state,
        runtimeLogs: [...state.runtimeLogs, action.payload].slice(-150),
      }
    case 'ADD_LIVE_WORKTREE':
      return { ...state, liveWorktrees: [...state.liveWorktrees, action.payload] }
    case 'UPDATE_LIVE_WORKTREE': {
      return {
        ...state,
        liveWorktrees: state.liveWorktrees.map(wt =>
          wt.id === action.payload.id ? { ...wt, ...action.payload } : wt
        ),
      }
    }
    case 'SET_PATCH_LIFECYCLE':
      return { ...state, patchLifecycle: action.payload }
    case 'UPDATE_WORKSPACE_HISTORY': {
      const rest = state.workspaceHistory.filter(h => h.workspaceId !== action.payload.workspaceId)
      return { ...state, workspaceHistory: [...rest, action.payload] }
    }
    case 'SET_GIT_DIFF':          return { ...state, gitDiff: action.payload }
    case 'SET_WORKTREE_ERROR':    return { ...state, lastWorktreeError: action.payload }
    case 'SET_COMMAND_RUNNING':   return { ...state, commandRunning: action.payload }
    default: return state
  }
}
