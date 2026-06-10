import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { taskGraphEngine, type TaskGraphState } from '../runtime/taskGraphEngine'
import { graphNodesToTasks, graphToRuntimePlan } from '../runtime/graphProjections'
import { getLocalStore } from '../runtime/store'
import type { RuntimePlan, Task } from '../types'

interface TaskGraphContextValue extends TaskGraphState {
  tasks: Task[]
  runtimePlan: RuntimePlan | null
  graphAvailable: boolean
}

const TaskGraphContext = createContext<TaskGraphContextValue | null>(null)

export function TaskGraphProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TaskGraphState>(taskGraphEngine.getState())
  const graphAvailable = getLocalStore().available

  useEffect(() => {
    taskGraphEngine.init().catch(console.error)
    return taskGraphEngine.subscribe(s => setState({ ...s }))
  }, [])

  const tasks = useMemo(
    () => graphNodesToTasks(state.nodes, state.activeProject),
    [state.nodes, state.activeProject],
  )

  const runtimePlan = useMemo(() => {
    if (!state.activeProject || state.nodes.length === 0) return null
    return graphToRuntimePlan(state.activeProject, state.nodes, state.edges)
  }, [state.activeProject, state.nodes, state.edges])

  return (
    <TaskGraphContext.Provider value={{ ...state, tasks, runtimePlan, graphAvailable }}>
      {children}
    </TaskGraphContext.Provider>
  )
}

export function useTaskGraph(): TaskGraphContextValue {
  const ctx = useContext(TaskGraphContext)
  if (!ctx) throw new Error('useTaskGraph must be used within TaskGraphProvider')
  return ctx
}
