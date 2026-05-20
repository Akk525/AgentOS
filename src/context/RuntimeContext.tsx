import { createContext, useContext, useReducer, useEffect, useCallback, type Dispatch } from 'react'
import { runtimeClient } from '../runtime/runtimeClient'
import { runtimeReducer, initialState, type RuntimeState, type RuntimeAction } from '../runtime/runtimeReducer'
import type { RuntimeEvent, RuntimeConnectionStatus } from '../runtime/runtimeTypes'
import type {
  SessionMode, TraceEvent, AgentCompletionNote, RuntimeNotification,
  RuntimeDaemonState, WorkspaceMountStatus, PermissionEscalation,
  ProviderHealth, RuntimeLogEntry, SessionLaunchConfig, LiveWorktree, PatchLifecycle,
} from '../types'

interface RuntimeContextValue extends RuntimeState {
  setSessionMode: (mode: SessionMode) => void
  setActiveTaskId: (id: string | null) => void
  addInjectedEvent: (event: TraceEvent) => void
  clearInjectedEvents: () => void
  triggerIntervention: (instruction: string) => void
  runTerminalCommand: (cmd: string) => void
  dismissNotification: (id: string) => void
  mountWorkspace: (workspaceId: string, localPath: string) => void
  unmountWorkspace: (workspaceId: string) => void
  approveEscalation: (escalationId: string) => void
  denyEscalation: (escalationId: string) => void
  restartDaemon: () => void
  simulateEscalation: () => void
  pingProvider: (providerId: string) => void
  pingAllProviders: () => void
  runDiagnostics: () => void
  spawnSession: (config: SessionLaunchConfig) => void
  createWorktree: (workspaceId: string, branch: string) => void
  runRealCommand: (command: string, worktreePath?: string) => void
  getGitDiff: (worktreePath?: string) => void
  clearWorktreeError: () => void
}

const RuntimeContext = createContext<RuntimeContextValue | null>(null)

function applyEngineEvent(event: RuntimeEvent, dispatch: Dispatch<RuntimeAction>): void {
  switch (event.type) {
    case 'CONNECTION_STATUS':
      dispatch({ type: 'SET_CONNECTION', payload: event.payload?.status as RuntimeConnectionStatus })
      break

    case 'PHASE_CHANGED': {
      const phase = event.payload?.phase as RuntimeState['runtimePhase']
      dispatch({ type: 'SET_PHASE', payload: phase })
      if (phase === 'human_controlled')    dispatch({ type: 'SET_SESSION_MODE', payload: 'human_controlled' })
      else if (phase === 'paused')         dispatch({ type: 'SET_SESSION_MODE', payload: 'paused' })
      else if (phase === 'autonomous_running') dispatch({ type: 'SET_SESSION_MODE', payload: 'autonomous' })
      break
    }

    case 'HUMAN_TOOK_CONTROL':
      dispatch({ type: 'SET_SESSION_MODE', payload: 'human_controlled' })
      break

    case 'HUMAN_RETURNED_CONTROL':
    case 'SESSION_RESUMED':
      dispatch({ type: 'SET_SESSION_MODE', payload: 'autonomous' })
      break

    case 'SESSION_PAUSED':
      dispatch({ type: 'SET_SESSION_MODE', payload: 'paused' })
      break

    case 'TRACE_EVENT':
      dispatch({ type: 'ADD_EVENT', payload: event.payload?.traceEvent as TraceEvent })
      break

    case 'PATCH_UPDATED':
      dispatch({ type: 'PATCH_UPDATED' })
      dispatch({ type: 'INCREMENT_INTERVENTION' })
      break

    case 'TEST_RUN_STARTED':
      dispatch({ type: 'TEST_RUN_STARTED' })
      break

    case 'TEST_RUN_COMPLETE':
      dispatch({ type: 'TEST_RUN_COMPLETE', payload: { passed: event.payload?.passed as boolean } })
      break

    case 'REVIEW_REFRESHED':
      dispatch({ type: 'REVIEW_REFRESHED', payload: { note: event.payload?.note as AgentCompletionNote } })
      break

    case 'TERMINAL_APPENDED':
      dispatch({ type: 'APPEND_TERMINAL_LINES', payload: event.payload?.lines as string[] })
      break

    case 'NOTIFICATION_ADDED':
      dispatch({ type: 'ADD_NOTIFICATION', payload: event.payload?.notification as RuntimeNotification })
      break

    case 'DAEMON_STATUS_CHANGED':
      dispatch({ type: 'SET_DAEMON_STATE', payload: event.payload?.daemonState as RuntimeDaemonState })
      break

    case 'WORKSPACE_MOUNTED':
      dispatch({
        type: 'UPDATE_MOUNT',
        payload: event.payload as unknown as WorkspaceMountStatus,
      })
      break

    case 'PERMISSION_ESCALATION_REQUIRED':
      dispatch({ type: 'SET_PENDING_ESCALATION', payload: event.payload?.escalation as PermissionEscalation })
      break

    case 'PERMISSION_ESCALATION_RESOLVED':
      dispatch({ type: 'SET_PENDING_ESCALATION', payload: null })
      break

    case 'PROVIDER_HEALTH_UPDATED':
      dispatch({ type: 'UPDATE_PROVIDER_HEALTH', payload: event.payload?.health as ProviderHealth })
      break

    case 'RUNTIME_LOG':
      dispatch({ type: 'APPEND_LOG', payload: event.payload?.log as RuntimeLogEntry })
      break

    case 'WORKTREE_CREATED': {
      const wt = event.payload?.worktree as LiveWorktree
      dispatch({ type: 'ADD_LIVE_WORKTREE', payload: wt })
      dispatch({ type: 'SET_WORKTREE_ERROR', payload: null })
      break
    }

    case 'WORKTREE_FAILED':
      dispatch({ type: 'SET_WORKTREE_ERROR', payload: event.payload?.error as string ?? 'Worktree creation failed' })
      break

    case 'SESSION_LAUNCH_FAILED':
      dispatch({ type: 'SET_WORKTREE_ERROR', payload: event.payload?.error as string ?? 'Session launch failed' })
      break

    case 'COMMAND_STARTED':
      dispatch({ type: 'SET_COMMAND_RUNNING', payload: true })
      break

    case 'COMMAND_COMPLETED':
      dispatch({ type: 'SET_COMMAND_RUNNING', payload: false })
      break

    case 'GIT_DIFF_UPDATED':
      dispatch({ type: 'SET_GIT_DIFF', payload: event.payload?.diff as string ?? null })
      break

    case 'PATCH_LIFECYCLE_CHANGED':
      dispatch({ type: 'SET_PATCH_LIFECYCLE', payload: event.payload?.patch as PatchLifecycle })
      break
  }
}

export function RuntimeProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(runtimeReducer, initialState)

  useEffect(() => {
    return runtimeClient.subscribe(event => applyEngineEvent(event, dispatch))
  }, [])

  const setSessionMode = useCallback((mode: SessionMode) => {
    if (mode === 'human_controlled') runtimeClient.takeControl()
    else if (mode === 'paused')      runtimeClient.pauseSession()
    else if (mode === 'autonomous')  runtimeClient.resumeSession()
    else dispatch({ type: 'SET_SESSION_MODE', payload: mode })
  }, [])

  const setActiveTaskId = useCallback((id: string | null) => {
    dispatch({ type: 'SET_ACTIVE_TASK', payload: id })
  }, [])

  const addInjectedEvent = useCallback((event: TraceEvent) => {
    dispatch({ type: 'ADD_EVENT', payload: event })
  }, [])

  const clearInjectedEvents = useCallback(() => {
    dispatch({ type: 'CLEAR_EVENTS' })
  }, [])

  const triggerIntervention = useCallback((instruction: string) => {
    runtimeClient.injectInstruction(instruction)
  }, [])

  const runTerminalCommand = useCallback((cmd: string) => {
    runtimeClient.runTerminalCommand(cmd)
  }, [])

  const dismissNotification = useCallback((id: string) => {
    dispatch({ type: 'DISMISS_NOTIFICATION', payload: id })
  }, [])

  const mountWorkspace = useCallback((workspaceId: string, localPath: string) => {
    runtimeClient.mountWorkspace(workspaceId, localPath)
  }, [])

  const unmountWorkspace = useCallback((workspaceId: string) => {
    runtimeClient.unmountWorkspace(workspaceId)
  }, [])

  const approveEscalation = useCallback((escalationId: string) => {
    runtimeClient.approveEscalation(escalationId)
  }, [])

  const denyEscalation = useCallback((escalationId: string) => {
    runtimeClient.denyEscalation(escalationId)
  }, [])

  const restartDaemon = useCallback(() => {
    runtimeClient.restartDaemon()
  }, [])

  const simulateEscalation = useCallback(() => {
    runtimeClient.simulateEscalation()
  }, [])

  const pingProvider = useCallback((providerId: string) => {
    runtimeClient.pingProvider(providerId)
  }, [])

  const pingAllProviders = useCallback(() => {
    runtimeClient.pingAllProviders()
  }, [])

  const runDiagnostics = useCallback(() => {
    runtimeClient.runDiagnostics()
  }, [])

  const spawnSession = useCallback((config: SessionLaunchConfig) => {
    runtimeClient.spawnSession(config)
  }, [])

  const createWorktree = useCallback((workspaceId: string, branch: string) => {
    runtimeClient.createWorktree(workspaceId, branch)
  }, [])

  const runRealCommand = useCallback((command: string, worktreePath?: string) => {
    runtimeClient.runRealCommand(command, worktreePath)
  }, [])

  const getGitDiff = useCallback((worktreePath?: string) => {
    runtimeClient.getGitDiff(worktreePath)
  }, [])

  const clearWorktreeError = useCallback(() => {
    dispatch({ type: 'SET_WORKTREE_ERROR', payload: null })
  }, [])

  const value: RuntimeContextValue = {
    ...state,
    setSessionMode,
    setActiveTaskId,
    addInjectedEvent,
    clearInjectedEvents,
    triggerIntervention,
    runTerminalCommand,
    dismissNotification,
    mountWorkspace,
    unmountWorkspace,
    approveEscalation,
    denyEscalation,
    restartDaemon,
    simulateEscalation,
    pingProvider,
    pingAllProviders,
    runDiagnostics,
    spawnSession,
    createWorktree,
    runRealCommand,
    getGitDiff,
    clearWorktreeError,
  }

  return (
    <RuntimeContext.Provider value={value}>
      {children}
    </RuntimeContext.Provider>
  )
}

export function useRuntime() {
  const ctx = useContext(RuntimeContext)
  if (!ctx) throw new Error('useRuntime must be used within RuntimeProvider')
  return ctx
}
