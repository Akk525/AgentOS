import { useMemo } from 'react'
import { rollupProject } from '../runtime/cost/costRollup'
import { useTaskGraph } from '../context/TaskGraphContext'

export function useProjectCost() {
  const { activeProject, nodes } = useTaskGraph()

  return useMemo(() => {
    if (!activeProject) return { tokensUsed: 0, costUsd: 0 }
    return rollupProject(activeProject.id, nodes)
  }, [activeProject, nodes])
}
