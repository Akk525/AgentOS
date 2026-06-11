import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { taskGraphEngine } from '../runtime/taskGraphEngine'
import { buildReplayTimeline } from '../runtime/replay/buildReplayTimeline'
import { buildProvenanceChain } from '../runtime/replay/provenanceChain'
import { replayController } from '../runtime/replay/replayController'
import type {
  ProvenanceChain,
  ReplayScope,
  ReplaySnapshot,
} from '../runtime/replay/replayTypes'

interface ReplayContextValue {
  isReplayMode: boolean
  loading: boolean
  scope: ReplayScope | null
  chain: ProvenanceChain | null
  snapshot: ReplaySnapshot | null
  totalSteps: number
  currentIndex: number
  enterReplay: (scope: Omit<ReplayScope, 'projectId'> & { projectId?: string }) => Promise<void>
  exitReplay: () => void
  seek: (index: number) => void
  stepForward: () => void
  stepBack: () => void
  jumpToStart: () => void
  jumpToEnd: () => void
}

const ReplayContext = createContext<ReplayContextValue | null>(null)

export function ReplayProvider({ children }: { children: ReactNode }) {
  const [isReplayMode, setIsReplayMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [scope, setScope] = useState<ReplayScope | null>(null)
  const [chain, setChain] = useState<ProvenanceChain | null>(null)
  const [snapshot, setSnapshot] = useState<ReplaySnapshot | null>(null)
  const [totalSteps, setTotalSteps] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)

  const exitReplay = useCallback(() => {
    setIsReplayMode(false)
    setScope(null)
    setChain(null)
    setSnapshot(null)
    setTotalSteps(0)
    setCurrentIndex(0)
  }, [])

  const enterReplay = useCallback(async (input: Omit<ReplayScope, 'projectId'> & { projectId?: string }) => {
    const graphState = taskGraphEngine.getState()
    const project = graphState.activeProject
    if (!project) return

    const projectId = input.projectId ?? project.id
    const fullScope: ReplayScope = { projectId, nodeId: input.nodeId, epicId: input.epicId, sessionId: input.sessionId }

    setLoading(true)
    setIsReplayMode(true)
    setScope(fullScope)

    try {
      const steps = await buildReplayTimeline(fullScope, graphState.nodes, graphState.edges)
      await replayController.load(projectId, steps, graphState.nodes)
      const provenance = await buildProvenanceChain(project, graphState.nodes, graphState.edges, fullScope)
      const initial = replayController.seek(0)

      setChain(provenance)
      setTotalSteps(replayController.totalSteps)
      setCurrentIndex(0)
      setSnapshot(initial)
    } finally {
      setLoading(false)
    }
  }, [])

  const seek = useCallback((index: number) => {
    const next = replayController.seek(index)
    setCurrentIndex(replayController.currentIndex)
    setSnapshot(next)
  }, [])

  const stepForward = useCallback(() => {
    const next = replayController.stepForward()
    if (!next) return
    setCurrentIndex(replayController.currentIndex)
    setSnapshot(next)
  }, [])

  const stepBack = useCallback(() => {
    const next = replayController.stepBack()
    if (!next) return
    setCurrentIndex(replayController.currentIndex)
    setSnapshot(next)
  }, [])

  const jumpToStart = useCallback(() => seek(0), [seek])
  const jumpToEnd = useCallback(() => seek(Math.max(0, replayController.totalSteps - 1)), [seek])

  const value = useMemo(
    (): ReplayContextValue => ({
      isReplayMode,
      loading,
      scope,
      chain,
      snapshot,
      totalSteps,
      currentIndex,
      enterReplay,
      exitReplay,
      seek,
      stepForward,
      stepBack,
      jumpToStart,
      jumpToEnd,
    }),
    [
      isReplayMode,
      loading,
      scope,
      chain,
      snapshot,
      totalSteps,
      currentIndex,
      enterReplay,
      exitReplay,
      seek,
      stepForward,
      stepBack,
      jumpToStart,
      jumpToEnd,
    ],
  )

  return <ReplayContext.Provider value={value}>{children}</ReplayContext.Provider>
}

export function useReplayContext(): ReplayContextValue {
  const ctx = useContext(ReplayContext)
  if (!ctx) throw new Error('useReplayContext must be used within ReplayProvider')
  return ctx
}
