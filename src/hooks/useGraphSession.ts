import { useState, useEffect } from 'react'
import { mockSession } from '../data/mockTraces'
import { useTaskGraph } from '../context/TaskGraphContext'
import { getLocalStore } from '../runtime/store'
import { storedSessionToSessionData } from '../runtime/sessionProjection'
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
    setLoading(true)

    getLocalStore()
      .listSessions(activeProject.id)
      .then(sessions => {
        if (cancelled) return
        const stored = sessions.find(s => s.nodeId === taskId)
        if (stored) {
          setSession(storedSessionToSessionData(stored, taskId))
          setFromStore(true)
        } else {
          setSession({ ...mockSession, taskId })
          setFromStore(false)
        }
      })
      .catch(() => {
        if (cancelled) return
        setSession({ ...mockSession, taskId })
        setFromStore(false)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [taskId, activeProject?.id])

  return { session, loading, fromStore }
}
