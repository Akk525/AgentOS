import { motion, AnimatePresence } from 'framer-motion'
import { GitBranch, Coins, TestTube, AlertTriangle, Clock, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useOrchestrator } from '../../context/OrchestratorContext'
import { formatRelativeTime } from '../../lib/utils'
import type { ActiveSession, OrchestratedSessionStatus } from '../../types'

const STATUS_CONFIG: Record<OrchestratedSessionStatus, {
  dot: string; label: string; color: string; bg: string; border: string
}> = {
  running:         { dot: 'bg-cyan-400',    label: 'Running',        color: 'text-cyan-400',    bg: 'bg-cyan-500/8',    border: 'border-cyan-500/20'   },
  blocked:         { dot: 'bg-amber-400',   label: 'Blocked',        color: 'text-amber-400',   bg: 'bg-amber-500/8',   border: 'border-amber-500/20'  },
  awaiting_review: { dot: 'bg-violet-400',  label: 'Awaiting review',color: 'text-violet-400',  bg: 'bg-violet-500/8',  border: 'border-violet-500/20' },
  reviewing:       { dot: 'bg-violet-300',  label: 'Under review',   color: 'text-violet-300',  bg: 'bg-violet-500/10', border: 'border-violet-500/25' },
  queued:          { dot: 'bg-slate-600',   label: 'Queued',         color: 'text-slate-500',   bg: 'bg-slate-500/5',   border: 'border-slate-500/15'  },
  initializing:    { dot: 'bg-emerald-400', label: 'Starting',       color: 'text-emerald-400', bg: 'bg-emerald-500/8', border: 'border-emerald-500/20'},
  completed:       { dot: 'bg-emerald-500', label: 'Completed',      color: 'text-emerald-500', bg: 'bg-emerald-500/6', border: 'border-emerald-500/15'},
  failed:          { dot: 'bg-crimson-500', label: 'Failed',         color: 'text-crimson-400', bg: 'bg-crimson-500/8', border: 'border-crimson-500/20'},
  planning:        { dot: 'bg-violet-500',  label: 'Planning',       color: 'text-violet-300',  bg: 'bg-violet-500/8',  border: 'border-violet-500/20' },
}

const PHASE_LABELS: Record<string, string> = {
  autonomous_running: 'autonomous',
  agent_replanning:   'replanning',
  patch_updating:     'patching',
  tests_rerunning:    'testing',
  ready_for_review:   'ready',
  human_controlled:   'manual',
  paused:             'paused',
}

const ROLE_COLORS: Record<string, string> = {
  debugger:      'text-crimson-400 bg-crimson-500/10',
  reviewer:      'text-violet-400 bg-violet-500/10',
  'test-writer': 'text-cyan-400 bg-cyan-500/10',
  refactorer:    'text-amber-400 bg-amber-500/10',
  architect:     'text-blue-400 bg-blue-500/10',
  planner:       'text-violet-300 bg-violet-500/15',
  general:       'text-slate-400 bg-slate-500/10',
}

function SessionRow({ session, index }: { session: ActiveSession; index: number }) {
  const cfg = STATUS_CONFIG[session.status]
  const isActive = session.status === 'running' || session.status === 'reviewing'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.18 }}
      className={cn(
        'glass rounded-xl border px-4 py-3 transition-all',
        cfg.border,
        session.status === 'blocked' ? 'opacity-80' : '',
      )}
    >
      <div className="flex items-center gap-3">
        {/* Status + agent */}
        <div className="flex items-center gap-2 flex-shrink-0 w-48">
          <div className="relative">
            <div className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot)} />
            {isActive && (
              <motion.div
                className={cn('absolute inset-0 rounded-full', cfg.dot)}
                animate={{ scale: [1, 2.5, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-slate-300">{session.agentName}</div>
            <div className={cn('text-[8px] font-mono px-1 py-0.5 rounded w-fit', ROLE_COLORS[session.agentRole] ?? ROLE_COLORS.general)}>
              {session.agentRole}
            </div>
          </div>
        </div>

        {/* Task info */}
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-mono text-slate-400 truncate">{session.taskTitle}</div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[9px] font-mono text-slate-700">
            <GitBranch size={7} />
            <span className="truncate max-w-[120px]">{session.branch}</span>
            <ChevronRight size={7} />
            <span>{session.workspaceName}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 flex-shrink-0 text-[9px] font-mono">
          {session.testsPassed !== undefined && (
            <div className="flex items-center gap-1 text-emerald-600">
              <TestTube size={9} />
              <span>{session.testsPassed}p</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-slate-700">
            <Coins size={9} />
            <span>{(session.tokensUsed / 1000).toFixed(1)}k</span>
          </div>
          <div className="flex items-center gap-1 text-slate-700">
            <Clock size={9} />
            <span>{formatRelativeTime(session.startedAt)}</span>
          </div>
          <div className={cn('px-1.5 py-0.5 rounded text-[8px] font-mono', cfg.bg, cfg.color, 'border', cfg.border)}>
            {cfg.label}
          </div>
        </div>
      </div>

      {/* Block reason */}
      {session.blockReason && (
        <div className="mt-2 flex items-start gap-1.5 text-[9px] font-mono text-amber-600/80 bg-amber-500/6 border border-amber-500/15 rounded-lg px-2 py-1.5">
          <AlertTriangle size={9} className="flex-shrink-0 mt-0.5" />
          <span>{session.blockReason}</span>
        </div>
      )}

      {/* Phase indicator for running */}
      {(session.status === 'running' || session.status === 'reviewing') && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-[2px] bg-white/[0.04] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500/40 to-cyan-400/60 rounded-full"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
            />
          </div>
          <span className="text-[8px] font-mono text-slate-700 flex-shrink-0">
            {PHASE_LABELS[session.phase] ?? session.phase}
          </span>
        </div>
      )}
    </motion.div>
  )
}

export function SessionCluster() {
  const { activeSessions, runtimeLoad } = useOrchestrator()

  const byStatus = (status: OrchestratedSessionStatus) =>
    activeSessions.filter(s => s.status === status).length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header stats */}
      <div className="flex items-center gap-5 px-5 py-3 border-b border-white/[0.04] flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <span className="text-cyan-400 font-semibold">{byStatus('running')}</span>
          <span className="text-slate-700">running</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <span className="text-violet-400 font-semibold">{byStatus('reviewing') + byStatus('awaiting_review')}</span>
          <span className="text-slate-700">in review</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <span className="text-amber-400 font-semibold">{byStatus('blocked')}</span>
          <span className="text-slate-700">blocked</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <span className="text-emerald-500 font-semibold">{byStatus('completed')}</span>
          <span className="text-slate-700">done</span>
        </div>
        <div className="ml-auto text-[10px] font-mono text-slate-700">
          {activeSessions.length}/{runtimeLoad.maxConcurrentSessions} capacity
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-2">
        <AnimatePresence>
          {activeSessions.map((session, i) => (
            <SessionRow key={session.id} session={session} index={i} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
