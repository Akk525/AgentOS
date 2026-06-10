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
  blocker_detected: 'blocker_detected',
  blocker_resolved: 'blocker_resolved',
  escalated: 'escalated',
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
    agentName: (payload.agentName as string) ?? undefined,
    workspaceName: (payload.workspaceName as string) ?? undefined,
    type: STORED_TO_ORCHESTRATOR[ev.type] ?? 'plan_created',
    message: ev.message,
    timestamp: ev.timestamp,
    severity: severity(ev.severity),
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
