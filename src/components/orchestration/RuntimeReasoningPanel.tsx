import { motion, AnimatePresence } from 'framer-motion'
import {
  Network, UserCheck, Clock, AlertTriangle, CheckCircle2,
  Cpu, ArrowRightLeft, User,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useOrchestrator } from '../../context/OrchestratorContext'
import { formatRelativeTime } from '../../lib/utils'
import type { RuntimeReasoning, ReasoningDecisionType } from '../../types'

const DECISION_CONFIG: Record<ReasoningDecisionType, {
  icon: React.ReactNode; label: string
}> = {
  plan_created:     { icon: <Network size={9} />,        label: 'plan'          },
  assignment:       { icon: <UserCheck size={9} />,      label: 'assignment'    },
  queue:            { icon: <Clock size={9} />,           label: 'queue'         },
  escalation:       { icon: <AlertTriangle size={9} />,   label: 'escalation'    },
  provider_reassign:{ icon: <Cpu size={9} />,             label: 'provider'      },
  blocker_detected: { icon: <AlertTriangle size={9} />,   label: 'blocker'       },
  blocker_resolved: { icon: <CheckCircle2 size={9} />,    label: 'resolved'      },
  human_override:   { icon: <User size={9} />,            label: 'override'      },
}

const SEVERITY_STYLES = {
  info:     { left: 'bg-slate-600',   badge: 'text-slate-500 bg-slate-500/10 border-slate-500/20',   text: 'text-slate-500'   },
  warning:  { left: 'bg-amber-500',   badge: 'text-amber-400 bg-amber-500/10 border-amber-500/20',   text: 'text-amber-700'   },
  critical: { left: 'bg-crimson-500', badge: 'text-crimson-400 bg-crimson-500/10 border-crimson-500/20', text: 'text-crimson-700' },
}

function ReasoningCard({ entry, index }: { entry: RuntimeReasoning; index: number }) {
  const decision = DECISION_CONFIG[entry.decisionType]
  const sev = SEVERITY_STYLES[entry.severity]

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.16 }}
      className="glass rounded-xl border border-white/[0.06] overflow-hidden flex"
    >
      {/* Severity stripe */}
      <div className={cn('w-0.5 flex-shrink-0', sev.left)} />

      {/* Body */}
      <div className="flex-1 px-3 py-3">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={cn('flex items-center gap-1 text-[8px] font-mono px-1.5 py-0.5 rounded border', sev.badge)}>
            {decision.icon}
            <span className="uppercase tracking-wide">{decision.label}</span>
          </span>

          {entry.affectedAgentName && (
            <span className="text-[9px] font-mono text-slate-500">
              → <span className="text-slate-400 font-semibold">{entry.affectedAgentName}</span>
            </span>
          )}

          <span className="ml-auto text-[8px] font-mono text-slate-700 flex-shrink-0">
            {formatRelativeTime(entry.timestamp)}
          </span>
        </div>

        <p className="text-[10px] font-mono text-slate-500 leading-relaxed">
          {entry.explanation}
        </p>
      </div>
    </motion.div>
  )
}

export function RuntimeReasoningPanel() {
  const { reasoning } = useOrchestrator()

  const sorted = [...reasoning].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  const counts = {
    warning: sorted.filter(r => r.severity === 'warning').length,
    critical: sorted.filter(r => r.severity === 'critical').length,
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/[0.04] flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-[9px] font-mono text-slate-700 uppercase tracking-widest">
            Orchestration reasoning
          </div>
          {counts.critical > 0 && (
            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-crimson-500/12 text-crimson-400 border border-crimson-500/20">
              {counts.critical} critical
            </span>
          )}
          {counts.warning > 0 && (
            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/12 text-amber-500 border border-amber-500/20">
              {counts.warning} warnings
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-700">
          <ArrowRightLeft size={9} />
          {sorted.length} decisions
        </div>
      </div>

      {/* Explanation note */}
      <div className="px-5 py-2 border-b border-white/[0.03] flex-shrink-0">
        <p className="text-[9px] font-mono text-slate-800 leading-relaxed">
          Every orchestration decision is logged here — assignments, blockers, provider routing, escalations.
        </p>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-2">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[11px] font-mono text-slate-700">
            No decisions logged yet
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {sorted.map((entry, i) => (
              <ReasoningCard key={entry.id} entry={entry} index={i} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
