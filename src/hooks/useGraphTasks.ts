import { mockTasks } from '../data/mockTasks'
import { useTaskGraph } from '../context/TaskGraphContext'

export function useGraphTasks() {
  const { tasks, loaded, graphAvailable } = useTaskGraph()

  if (!graphAvailable || !loaded || tasks.length === 0) {
    return { tasks: mockTasks, fromGraph: false }
  }

  return { tasks, fromGraph: true }
}
