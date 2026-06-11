import type { TraceEvent, TraceEventType } from '../../types'
import { getLocalStore } from '../store'
import { updateSessionData } from '../sessionStore'

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export async function emitSkillLoaded(
  projectId: string,
  nodeId: string,
  sessionId: string | undefined,
  skillIds: string[],
  skillNames: string[],
): Promise<void> {
  await getLocalStore().appendEvent({
    projectId,
    nodeId,
    sessionId,
    type: 'skill_loaded',
    message: `Loaded ${skillNames.length} skill${skillNames.length === 1 ? '' : 's'}: ${skillNames.join(', ')}`,
    severity: 'info',
    payload: { skillIds, skillNames },
  })
}

export async function emitSkillToolTrace(input: {
  projectId: string
  nodeId: string
  sessionId?: string
  traceType: TraceEventType
  label: string
  detail?: string
  payload?: Record<string, unknown>
}): Promise<void> {
  const traceEvent: TraceEvent = {
    id: uid('te'),
    type: input.traceType,
    timestamp: new Date().toISOString(),
    label: input.label,
    actor: 'agent',
    detail: input.detail,
  }

  await updateSessionData(input.projectId, input.nodeId, { events: [traceEvent] })

  await getLocalStore().appendEvent({
    projectId: input.projectId,
    nodeId: input.nodeId,
    sessionId: input.sessionId,
    type: input.traceType,
    message: input.label,
    severity: 'info',
    payload: input.payload ?? {},
  })
}
