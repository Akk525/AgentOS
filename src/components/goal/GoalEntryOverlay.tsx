import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Circle, ChevronRight, Target } from 'lucide-react'
import { cn } from '../../lib/utils'
import { planFromGoal } from '../../runtime/mockPlanner'
import { orchestratorRuntime } from '../../runtime/orchestratorRuntime'
import type { GovernanceMode } from '../../types/graph'

type OverlayState = 'idle' | 'planning' | 'error'

const GOVERNANCE_OPTIONS: { value: GovernanceMode; label: string }[] = [
  { value: 'assisted', label: 'Assisted' },
  { value: 'manual', label: 'Manual' },
  { value: 'autonomous', label: 'Autonomous' },
]

const PLANNING_LINES = [
  '→ parsing goal description',
  '→ identifying work streams',
  '→ mapping dependencies',
  '✓ plan ready',
]

interface GoalEntryOverlayProps {
  onComplete: () => void
}

export function GoalEntryOverlay({ onComplete }: GoalEntryOverlayProps) {
  const [goalText, setGoalText] = useState('')
  const [governanceMode, setGovernanceMode] = useState<GovernanceMode>('assisted')
  const [overlayState, setOverlayState] = useState<OverlayState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [planningLine, setPlanningLine] = useState(0)

  async function handleSubmit() {
    const trimmed = goalText.trim()
    if (!trimmed || overlayState === 'planning') return

    setOverlayState('planning')
    setErrorMessage('')
    setPlanningLine(0)

    const lineTimers = PLANNING_LINES.map((_, i) =>
      setTimeout(() => setPlanningLine(i), i * 400),
    )

    const minDelay = new Promise(resolve => setTimeout(resolve, 1200))

    try {
      await Promise.all([
        minDelay,
        planFromGoal(trimmed, { governanceMode }),
      ])
      await orchestratorRuntime.refreshFromStore()
      lineTimers.forEach(clearTimeout)
      onComplete()
    } catch (err) {
      lineTimers.forEach(clearTimeout)
      setOverlayState('error')
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create plan')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[250] flex items-center justify-center"
      style={{ background: 'rgba(6,6,10,0.96)', backdropFilter: 'blur(16px)' }}
    >
      <AnimatePresence mode="wait">
        {overlayState === 'planning' ? (
          <motion.div
            key="planning"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center max-w-md w-full px-8"
          >
            <div className="w-12 h-12 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center mb-6">
              <Target size={22} className="text-violet-300" />
            </div>
            <div className="text-[10px] font-mono text-violet-400 uppercase tracking-widest mb-2">
              Planner active
            </div>
            <h2 className="text-lg font-semibold text-white mb-6 text-center">
              Lyra is decomposing your goal…
            </h2>
            <div className="font-mono text-[11px] space-y-1.5 text-left w-full max-w-xs">
              {PLANNING_LINES.map((line, i) => (
                <motion.div
                  key={line}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: i <= planningLine ? 1 : 0.2, x: 0 }}
                  className={cn(
                    'leading-relaxed',
                    line.startsWith('✓') ? 'text-emerald-400' : 'text-slate-500',
                  )}
                >
                  {line}
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex flex-col items-center max-w-lg w-full px-8"
          >
            <div className="w-14 h-14 rounded-2xl bg-crimson-600 flex items-center justify-center shadow-[0_0_48px_rgba(244,63,94,0.35)] mb-5">
              <Circle size={24} className="text-white fill-white" />
            </div>

            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">
              New project
            </div>
            <h1 className="text-xl font-semibold text-white mb-2 text-center">
              Describe what you want built
            </h1>
            <p className="text-[12px] text-slate-500 font-mono text-center mb-6 max-w-sm leading-relaxed">
              AgentOS will create a task graph from your goal. No LLM required in this preview.
            </p>

            <div className="w-full space-y-4">
              <textarea
                value={goalText}
                onChange={e => setGoalText(e.target.value)}
                placeholder="e.g. Build a REST API for task management with auth and tests…"
                rows={5}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[13px] text-slate-200 placeholder:text-slate-600 font-mono resize-none focus:outline-none focus:border-crimson-500/40 focus:ring-1 focus:ring-crimson-500/20"
                autoFocus
              />

              <div className="flex items-center gap-3">
                <label className="text-[10px] font-mono text-slate-600 uppercase tracking-wider shrink-0">
                  Governance
                </label>
                <select
                  value={governanceMode}
                  onChange={e => setGovernanceMode(e.target.value as GovernanceMode)}
                  className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] font-mono text-slate-300 focus:outline-none focus:border-violet-500/30"
                >
                  {GOVERNANCE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-[#0c0c12]">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {overlayState === 'error' && errorMessage && (
                <p className="text-[11px] font-mono text-crimson-400">{errorMessage}</p>
              )}

              <button
                onClick={() => void handleSubmit()}
                disabled={!goalText.trim()}
                className={cn(
                  'w-full flex items-center justify-center gap-2 text-[12px] font-mono px-5 py-3 rounded-xl transition-colors',
                  goalText.trim()
                    ? 'bg-crimson-600 text-white hover:bg-crimson-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                    : 'bg-white/[0.04] text-slate-600 cursor-not-allowed',
                )}
              >
                Create plan
                <ChevronRight size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
