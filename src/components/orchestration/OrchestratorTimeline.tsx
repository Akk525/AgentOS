import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, GitCommit, CheckCircle2, XCircle, Shield,
  MessageSquare, AlertTriangle, Cpu, Clock, GitMerge,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useOrchestrator } from '../../context/OrchestratorContext'
import { formatRelativeTime } from '../../lib/utils'
import type { OrchestratorEvent, OrchestratorEventType, OrchestratorEventSeverity } from '../../types'

const TYPE_CONFIG: Record<OrchestratorEventType, {
  icon: React.ReactNode
  label: string
}> = {
  session_started:  { icon: <Play size={9} />,          label: 'started'      },
  patch_updated:    { icon: <GitCommit size={9} />,      label: 'patch'        },
  tests_passed:     { icon: <CheckCircle2 size={9} />,   label: 'tests'        },
  tests_failed:     { icon: <XCircle size={9} />,        label: 'tests'        },
  review_assigned:  { icon: <Shield size={9} />,         label: 'review'       },
  review_comment:   { icon: <MessageSquare size={9} />,  label: 'comment'      },
  review_approved:  { icon: <CheckCircle2 size={9} />,   label: 'approved'     },
  session_blocked:  { icon: <AlertTriangle size={9} />,  label: 'blocked'      },
  session_completed:{ icon: <GitMerge size={9} />,       label: 'completed'    },
  provider_load:    { icon: <Cpu size={9} />,            label: 'provider'     },
  session_queued:   { icon: <Clock size={9} />,          label: 'queued'       },
  merge_conflict:   { icon: <XCircle size={9} />,        label: 'conflict'     },
  merge_completed:  { icon: <GitMerge size={9} />,       label: 'merged'       },
  plan_created:     { icon: <Play size={9} />,           label: 'plan'         },
  usage_recorded:   { icon: <Cpu size={9} />,            label: 'usage'        },
  merge_conflict_fix_spawned: { icon: <AlertTriangle size={9} />, label: 'merge fix' },
  test_failure_fix_spawned: { icon: <AlertTriangle size={9} />, label: 'test fix' },
  subtask_assigned: { icon: <CheckCircle2 size={9} />,   label: 'assigned'     },
  blocker_detected: { icon: <XCircle size={9} />,        label: 'blocker'      },
  blocker_resolved: { icon: <CheckCircle2 size={9} />,   label: 'resolved'     },
  escalated:        { icon: <AlertTriangle size={9} />,  label: 'escalated'    },
}

const SEVERITY_COLORS: Record<OrchestratorEventSeverity, { dot: string; text: string; dim: string }> = {
  info:    { dot: 'bg-slate-500',    text: 'text-slate-400',   dim: 'text-slate-700'  },
  success: { dot: 'bg-emerald-500',  text: 'text-emerald-400', dim: 'text-emerald-800'},
  warning: { dot: 'bg-amber-500',    text: 'text-amber-400',   dim: 'text-amber-800'  },
  error:   { dot: 'bg-crimson-500',  text: 'text-crimson-400', dim: 'text-crimson-800'},
}

const AGENT_COLORS: Record<string, string> = {
  Cipher:  'text-cyan-400',
  Echo:    'text-violet-400',
  Atlas:   'text-emerald-400',
  Refactor:'text-amber-400',
  Nexus:   'text-blue-400',
}

function TimelineRow({ event, index }: { event: OrchestratorEvent; index: number }) {
  const sev = SEVERITY_COLORS[event.severity]
  const typeConf = TYPE_CONFIG[event.type]
  const agentColor = event.agentName ? (AGENT_COLORS[event.agentName] ?? 'text-slate-400') : 'text-slate-600'

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.18 }}
      className="flex items-start gap-3 group"
    >
      {/* Timeline spine */}
      <div className="flex flex-col items-center flex-shrink-0 pt-1">
        <div className={cn('w-1.5 h-1.5 rounded-full ring-2 ring-[#06060a]', sev.dot)} />
        <div className="w-px flex-1 bg-white/[0.04] mt-1 min-h-[24px]" />
      </div>

      {/* Content */}
      <div className="pb-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {/* Type badge */}
          <span className={cn('text-[8px] font-mono flex items-center gap-1', sev.text)}>
            {typeConf.icon}
            <span className="uppercase tracking-wide">{typeConf.label}</span>
          </span>

          {/* Agent name */}
          {event.agentName && (
            <span className={cn('text-[9px] font-mono font-semibold', agentColor)}>
              {event.agentName}
            </span>
          )}

          {/* Workspace */}
          {event.workspaceName && (
            <>
              <span className="text-slate-800 text-[8px]">in</span>
              <span className="text-[9px] font-mono text-slate-600">{event.workspaceName}</span>
            </>
          )}

          <span className={cn('ml-auto text-[8px] font-mono flex-shrink-0', sev.dim)}>
            {formatRelativeTime(event.timestamp)}
          </span>
        </div>

        <p className="text-[10px] font-mono text-slate-500 leading-relaxed">{event.message}</p>
      </div>
    </motion.div>
  )
}

export function OrchestratorTimeline() {
  const { timeline } = useOrchestrator()
  const sorted = [...timeline].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-3 border-b border-white/[0.04] flex-shrink-0 flex items-center justify-between">
        <div className="text-[9px] font-mono text-slate-700 uppercase tracking-widest">
          Orchestration feed
        </div>
        <div className="text-[9px] font-mono text-slate-700">
          {sorted.length} events
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 pt-4">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[11px] font-mono text-slate-700">
            No events yet
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {sorted.map((event, i) => (
              <TimelineRow key={event.id} event={event} index={i} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
