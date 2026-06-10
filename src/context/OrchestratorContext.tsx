import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { orchestratorRuntime, type OrchestratorState } from '../runtime/orchestratorRuntime'

interface OrchestratorContextValue extends OrchestratorState {
  escalateBlocker: (id: string) => void
  overrideAssignment: (sessionId: string, field: string, value: string) => void
}

const OrchestratorContext = createContext<OrchestratorContextValue | null>(null)

export function OrchestratorProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OrchestratorState>(orchestratorRuntime.getState())

  useEffect(() => {
    orchestratorRuntime.init().catch(console.error)
    return orchestratorRuntime.subscribe(s => setState({ ...s }))
  }, [])

  const escalateBlocker = useCallback((id: string) => {
    orchestratorRuntime.escalateBlocker(id)
  }, [])

  const overrideAssignment = useCallback((sessionId: string, field: string, value: string) => {
    orchestratorRuntime.overrideAssignment(sessionId, field, value)
  }, [])

  return (
    <OrchestratorContext.Provider value={{ ...state, escalateBlocker, overrideAssignment }}>
      {children}
    </OrchestratorContext.Provider>
  )
}

export function useOrchestrator(): OrchestratorContextValue {
  const ctx = useContext(OrchestratorContext)
  if (!ctx) throw new Error('useOrchestrator must be used within OrchestratorProvider')
  return ctx
}
