import { motion } from 'framer-motion'
import { Clock, AlertTriangle, Layers, Cpu, GitMerge } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useOrchestrator } from '../../context/OrchestratorContext'
import type { RuntimeQueueEntry } from '../../types'

const WAIT_REASON_CONFIG = {
  provider:         { icon: <Cpu size={9} />,       label: 'Provider saturated', color: 'text-crimson-400' },
  runtime_capacity: { icon: <Layers size={9} />,    label: 'Runtime at capacity', color: 'text-amber-400' },
  dependency:       { icon: <GitMerge size={9} />,  label: 'Waiting on dependency', color: 'text-violet-400' },
}

const PRIORITY_CONFIG = {
  high:   { label: 'high',   color: 'text-crimson-400 bg-crimson-500/10 border-crimson-500/20' },
  normal: { label: 'normal', color: 'text-slate-500 bg-white/[0.04] border-white/[0.06]' },
  low:    { label: 'low',    color: 'text-slate-700 bg-white/[0.02] border-white/[0.04]' },
}

function formatWait(seconds: number): string {
  if (seconds < 60) return `~${seconds}s`
  return `~${Math.round(seconds / 60)}m`
}

function QueueCard({ entry, position }: { entry: RuntimeQueueEntry; position: number }) {
  const reason = WAIT_REASON_CONFIG[entry.waitingFor]
  const priority = PRIORITY_CONFIG[entry.priority]

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: position * 0.05, duration: 0.15 }}
      className="glass rounded-xl border border-white/[0.06] px-4 py-3"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[9px] font-mono text-slate-600">
          {position + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-mono text-slate-300 truncate">{entry.taskTitle}</div>
          <div className="text-[9px] font-mono text-slate-700 mt-0.5">
            {entry.workspaceName} · {entry.agentName}
          </div>
          <div className={cn('flex items-center gap-1 mt-1.5 text-[9px] font-mono', reason.color)}>
            {reason.icon}
            <span>{reason.label}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className={cn('text-[8px] font-mono px-1.5 py-0.5 rounded border', priority.color)}>
            {priority.label}
          </span>
          <div className="flex items-center gap-1 text-[9px] font-mono text-slate-700">
            <Clock size={8} />
            <span>{formatWait(entry.estimatedWaitSeconds)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function RuntimeQueuePanel() {
  const { runtimeQueue, runtimeLoad } = useOrchestrator()

  const isAtCapacity = runtimeLoad.activeSessions >= runtimeLoad.maxConcurrentSessions
  const anthropicSaturated = (runtimeLoad.providerCapacity.anthropic?.used ?? 0) >=
    (runtimeLoad.providerCapacity.anthropic?.max ?? 5)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Status strip */}
      <div className="px-5 py-3 border-b border-white/[0.04] flex-shrink-0 space-y-2">
        {isAtCapacity && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/20 text-[10px] font-mono text-amber-400">
            <AlertTriangle size={10} />
            Runtime at session capacity — new sessions queued
          </div>
        )}
        {anthropicSaturated && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-crimson-500/8 border border-crimson-500/20 text-[10px] font-mono text-crimson-400">
            <Cpu size={10} />
            Anthropic at max capacity ({runtimeLoad.providerCapacity.anthropic?.used}/{runtimeLoad.providerCapacity.anthropic?.max}) — provider queuing active
          </div>
        )}

        {/* Capacity bars */}
        <div className="grid grid-cols-3 gap-3 pt-1">
          {Object.entries(runtimeLoad.providerCapacity).map(([id, cap]) => {
            const pct = cap.used / cap.max
            return (
              <div key={id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-mono text-slate-700 capitalize">{id}</span>
                  <span className="text-[9px] font-mono text-slate-600">{cap.used}/{cap.max}</span>
                </div>
                <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                  <motion.div
                    className={cn(
                      'h-full rounded-full',
                      pct >= 1 ? 'bg-crimson-500' : pct >= 0.8 ? 'bg-amber-400' : 'bg-emerald-500/60',
                    )}
                    animate={{ width: `${pct * 100}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Queue */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {runtimeQueue.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[11px] font-mono text-slate-700">
            Queue empty — runtime fully available
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-[9px] font-mono text-slate-700 uppercase tracking-widest mb-3">
              {runtimeQueue.length} sessions waiting
            </div>
            {runtimeQueue.map((entry, i) => (
              <QueueCard key={entry.id} entry={entry} position={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
