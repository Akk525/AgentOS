import type { StoredEvent } from '../types/graph'
import type { OrchestratorEvent, OrchestratorEventSeverity, OrchestratorEventType } from '../types'

const STORED_TO_ORCHESTRATOR: Record<string, OrchestratorEventType> = {
  system_event: 'plan_created',
  plan_created: 'plan_created',
  subtask_assigned: 'subtask_assigned',
  session_started: 'session_started',
  patch_updated: 'patch_updated',
  tests_passed: 'tests_passed',
  tests_failed: 'tests_failed',
  review_assigned: 'review_assigned',
  review_comment: 'review_comment',
  review_approved: 'review_approved',
  session_blocked: 'session_blocked',
  session_completed: 'session_completed',
  provider_load: 'provider_load',
  session_queued: 'session_queued',
  merge_conflict: 'merge_conflict',
  merge_completed: 'merge_completed',
  usage_recorded: 'usage_recorded',
  merge_conflict_fix_spawned: 'merge_conflict_fix_spawned',
  test_failure_fix_spawned: 'test_failure_fix_spawned',
  blocker_detected: 'blocker_detected',
  blocker_resolved: 'blocker_resolved',
  escalated: 'escalated',
  memory_recorded: 'memory_recorded',
  fetch_context: 'fetch_context',
  skill_loaded: 'skill_loaded',
  read_file: 'read_file',
  search_code: 'search_code',
  run_tests: 'run_tests',
}

function severity(s: string): OrchestratorEventSeverity {
  if (s === 'warning' || s === 'success' || s === 'error') return s
  return 'info'
}

export function storedEventToOrchestrator(ev: StoredEvent): OrchestratorEvent {
  const payload = ev.payload ?? {}
  return {
    id: ev.id,
    sessionId: ev.sessionId ?? undefined,
    nodeId: ev.nodeId ?? undefined,
    agentName: (payload.agentName as string) ?? undefined,
    workspaceName: (payload.workspaceName as string) ?? undefined,
    type: STORED_TO_ORCHESTRATOR[ev.type] ?? (ev.type as OrchestratorEventType),
    message: ev.message,
    timestamp: ev.timestamp,
    severity: severity(ev.severity),
    payload,
  }
}

export function orchestratorEventToAppendInput(
  ev: Omit<OrchestratorEvent, 'id' | 'timestamp'>,
  projectId?: string | null,
): {
  projectId?: string | null
  sessionId?: string | null
  type: string
  message: string
  severity: OrchestratorEventSeverity
  payload: Record<string, unknown>
} {
  return {
    projectId: projectId ?? null,
    sessionId: ev.sessionId ?? null,
    type: ev.type,
    message: ev.message,
    severity: ev.severity,
    payload: {
      agentName: ev.agentName,
      workspaceName: ev.workspaceName,
    },
  }
}
