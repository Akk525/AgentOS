import { AnimatePresence } from 'framer-motion'
import { useTaskGraph } from '../../context/TaskGraphContext'
import { GoalEntryOverlay } from './GoalEntryOverlay'
import type { View } from '../../App'

interface GoalEntryGateProps {
  onViewChange: (view: View) => void
}

export function GoalEntryGate({ onViewChange }: GoalEntryGateProps) {
  const { needsGoalEntry } = useTaskGraph()

  return (
    <AnimatePresence>
      {needsGoalEntry && (
        <GoalEntryOverlay
          onComplete={() => onViewChange('orchestration')}
        />
      )}
    </AnimatePresence>
  )
}
