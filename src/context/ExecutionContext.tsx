import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import {
  executionCoordinator,
  type ExecutionCoordinatorState,
} from '../runtime/executionCoordinator'
import { orchestratorRuntime } from '../runtime/orchestratorRuntime'

interface ExecutionContextValue extends ExecutionCoordinatorState {
  setAutoRun: (enabled: boolean) => void
  runNode: (nodeId: string) => Promise<void>
  approveReview: (nodeId: string) => Promise<void>
  rejectReview: (nodeId: string) => Promise<void>
  requestReviewChanges: (nodeId: string, note: string) => Promise<void>
}

const ExecutionContext = createContext<ExecutionContextValue | null>(null)

export function ExecutionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ExecutionCoordinatorState>(executionCoordinator.getState())

  useEffect(() => {
    void orchestratorRuntime.init()
    void executionCoordinator.start()
    return executionCoordinator.subscribe(setState)
  }, [])

  const setAutoRun = useCallback((enabled: boolean) => {
    executionCoordinator.setAutoRun(enabled)
  }, [])

  const runNode = useCallback(async (nodeId: string) => {
    await executionCoordinator.runNode(nodeId)
  }, [])

  const approveReview = useCallback(async (nodeId: string) => {
    await executionCoordinator.approveReview(nodeId)
  }, [])

  const rejectReview = useCallback(async (nodeId: string) => {
    await executionCoordinator.rejectReview(nodeId)
  }, [])

  const requestReviewChanges = useCallback(async (nodeId: string, note: string) => {
    await executionCoordinator.requestReviewChanges(nodeId, note)
  }, [])

  return (
    <ExecutionContext.Provider
      value={{
        ...state,
        setAutoRun,
        runNode,
        approveReview,
        rejectReview,
        requestReviewChanges,
      }}
    >
      {children}
    </ExecutionContext.Provider>
  )
}

export function useExecution(): ExecutionContextValue {
  const ctx = useContext(ExecutionContext)
  if (!ctx) throw new Error('useExecution must be used within ExecutionProvider')
  return ctx
}
