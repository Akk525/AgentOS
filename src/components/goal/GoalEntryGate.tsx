import { AnimatePresence } from 'framer-motion'
import { useTaskGraph } from '../../context/TaskGraphContext'
import { GoalEntryOverlay } from './GoalEntryOverlay'
import type { View } from '../../App'

interface GoalEntryGateProps {
  forceOpen?: boolean
  onClose?: () => void
  onViewChange: (view: View) => void
}

export function GoalEntryGate({ forceOpen = false, onClose, onViewChange }: GoalEntryGateProps) {
  const { needsGoalEntry } = useTaskGraph()
  const show = needsGoalEntry || forceOpen

  return (
    <AnimatePresence>
      {show && (
        <GoalEntryOverlay
          onComplete={() => {
            onClose?.()
            onViewChange('orchestration')
          }}
        />
      )}
    </AnimatePresence>
  )
}
