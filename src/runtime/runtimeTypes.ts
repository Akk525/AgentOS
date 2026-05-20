export type RuntimeEventType =
  | 'CONNECTION_STATUS'
  | 'HEARTBEAT'
  | 'SESSION_PAUSED'
  | 'SESSION_RESUMED'
  | 'HUMAN_TOOK_CONTROL'
  | 'HUMAN_RETURNED_CONTROL'
  | 'TRACE_EVENT'
  | 'PHASE_CHANGED'
  | 'PATCH_UPDATED'
  | 'TEST_RUN_STARTED'
  | 'TEST_RUN_COMPLETE'
  | 'REVIEW_REFRESHED'
  | 'TERMINAL_APPENDED'
  | 'METRIC_UPDATE'
  | 'NOTIFICATION_ADDED'
  | 'DAEMON_STATUS_CHANGED'
  | 'WORKSPACE_MOUNTED'
  | 'WORKSPACE_UNMOUNTED'
  | 'PERMISSION_ESCALATION_REQUIRED'
  | 'PERMISSION_ESCALATION_RESOLVED'
  | 'PROVIDER_STATUS_CHANGED'
  | 'PROVIDER_HEALTH_UPDATED'
  | 'REPO_VALIDATED'
  | 'RUNTIME_LOG'
  | 'TERMINAL_SESSION_STARTED'
  | 'TERMINAL_SESSION_ENDED'
  | 'WORKTREE_CREATED'
  | 'WORKTREE_FAILED'
  | 'SESSION_SPAWNED'
  | 'SESSION_LAUNCH_FAILED'
  | 'PATCH_LIFECYCLE_CHANGED'
  | 'COMMAND_STARTED'
  | 'COMMAND_OUTPUT'
  | 'COMMAND_COMPLETED'
  | 'GIT_DIFF_UPDATED'

export interface RuntimeEvent {
  id: string
  type: RuntimeEventType
  timestamp: string
  sequenceId: number
  payload?: Record<string, unknown>
}

export type RuntimeCommandType =
  | 'TAKE_CONTROL'
  | 'RETURN_CONTROL'
  | 'INJECT_INSTRUCTION'
  | 'RUN_TERMINAL_COMMAND'
  | 'PAUSE_SESSION'
  | 'RESUME_SESSION'
  | 'RERUN_TESTS'
  | 'MOUNT_WORKSPACE'
  | 'UNMOUNT_WORKSPACE'
  | 'APPROVE_ESCALATION'
  | 'DENY_ESCALATION'
  | 'RESTART_DAEMON'
  | 'SIMULATE_ESCALATION'
  | 'PING_PROVIDER'
  | 'PING_ALL_PROVIDERS'
  | 'CONNECT_PROVIDER'
  | 'RUN_DIAGNOSTICS'
  | 'SPAWN_TERMINAL'
  | 'SPAWN_SESSION'
  | 'CREATE_WORKTREE'
  | 'RUN_REAL_COMMAND'
  | 'GET_GIT_DIFF'

export interface RuntimeCommand {
  type: RuntimeCommandType
  timestamp: string
  payload?: Record<string, unknown>
}

export type RuntimeConnectionStatus = 'connecting' | 'connected' | 'syncing' | 'disconnected'

export type RuntimeEventListener = (event: RuntimeEvent) => void
