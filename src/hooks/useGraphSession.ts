import { useState, useEffect } from 'react'
import { mockSession } from '../data/mockTraces'
import { useTaskGraph } from '../context/TaskGraphContext'
import { getLocalStore } from '../runtime/store'
import { storedSessionToSessionData } from '../runtime/sessionProjection'
import { taskGraphEngine } from '../runtime/taskGraphEngine'
import { executionCoordinator } from '../runtime/executionCoordinator'
import type { SessionData } from '../types'

export function useGraphSession(taskId: string | undefined): {
  session: SessionData | null
  loading: boolean
  fromStore: boolean
} {
  const { activeProject } = useTaskGraph()
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [fromStore, setFromStore] = useState(false)

  useEffect(() => {
    if (!taskId || !activeProject) {
      setSession(null)
      setFromStore(false)
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const sessions = await getLocalStore().listSessions(activeProject!.id)
        if (cancelled) return
        const stored = sessions.find(s => s.nodeId === taskId)
        if (stored) {
          setSession(storedSessionToSessionData(stored, taskId!))
          setFromStore(true)
        } else {
          setSession({ ...mockSession, taskId: taskId! })
          setFromStore(false)
        }
      } catch {
        if (cancelled) return
        setSession({ ...mockSession, taskId: taskId! })
        setFromStore(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    const unsub = taskGraphEngine.subscribe(() => {
      if (!cancelled) void load()
    })

    const poll = setInterval(() => {
      const { running, activeNodeId } = executionCoordinator.getState()
      if (running && activeNodeId === taskId && !cancelled) {
        void load()
      }
    }, 500)

    return () => {
      cancelled = true
      unsub()
      clearInterval(poll)
    }
  }, [taskId, activeProject?.id])

  return { session, loading, fromStore }
}
