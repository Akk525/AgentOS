import { motion, AnimatePresence } from 'framer-motion'
import {
  Network, CheckCircle2, AlertTriangle, Clock, GitBranch,
  TestTube, ArrowDown, XCircle, Cpu, GitMerge, ChevronRight,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useOrchestrator } from '../../context/OrchestratorContext'
import { useTaskGraph } from '../../context/TaskGraphContext'
import { formatRelativeTime } from '../../lib/utils'
import type { PlanSubtask, PlanSubtaskStatus, RuntimeBlocker, BlockerType } from '../../types'

// ── Subtask status ────────────────────────────────────────────────────────────

const SUBTASK_STATUS: Record<PlanSubtaskStatus, {
  dot: string; label: string; color: string; bg: string; border: string
}> = {
  pending:  { dot: 'bg-slate-600',   label: 'Pending',  color: 'text-slate-500',   bg: 'bg-slate-500/5',    border: 'border-slate-500/12'  },
  assigned: { dot: 'bg-violet-400',  label: 'Assigned', color: 'text-violet-400',  bg: 'bg-violet-500/8',   border: 'border-violet-500/20' },
  running:  { dot: 'bg-cyan-400',    label: 'Running',  color: 'text-cyan-400',    bg: 'bg-cyan-500/8',     border: 'border-cyan-500/20'   },
  review:   { dot: 'bg-violet-300',  label: 'Review',   color: 'text-violet-300',  bg: 'bg-violet-500/10',  border: 'border-violet-500/25' },
  done:     { dot: 'bg-emerald-500', label: 'Done',     color: 'text-emerald-400', bg: 'bg-emerald-500/6',  border: 'border-emerald-500/15'},
  blocked:  { dot: 'bg-amber-400',   label: 'Blocked',  color: 'text-amber-400',   bg: 'bg-amber-500/8',    border: 'border-amber-500/20'  },
}

const ROLE_COLORS: Record<string, string> = {
  debugger:      'text-crimson-400',
  reviewer:      'text-violet-400',
  'test-writer': 'text-cyan-400',
  refactorer:    'text-amber-400',
  architect:     'text-blue-400',
  planner:       'text-violet-300',
  general:       'text-slate-400',
}

const BLOCKER_CONFIG: Record<BlockerType, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  dependency:          { icon: <GitMerge size={10} />,     color: 'text-amber-400',   bg: 'bg-amber-500/8',   border: 'border-amber-500/20'  },
  merge_conflict:      { icon: <XCircle size={10} />,      color: 'text-crimson-400', bg: 'bg-crimson-500/8', border: 'border-crimson-500/20' },
  provider_overload:   { icon: <Cpu size={10} />,          color: 'text-crimson-400', bg: 'bg-crimson-500/8', border: 'border-crimson-500/20' },
  permission_required: { icon: <AlertTriangle size={10} />,color: 'text-amber-400',   bg: 'bg-amber-500/8',   border: 'border-amber-500/20'  },
  stalled:             { icon: <Clock size={10} />,         color: 'text-slate-400',   bg: 'bg-slate-500/8',   border: 'border-slate-500/20'  },
  review_timeout:      { icon: <Clock size={10} />,         color: 'text-amber-400',   bg: 'bg-amber-500/8',   border: 'border-amber-500/20'  },
}

// ── Subtask row ───────────────────────────────────────────────────────────────

function SubtaskRow({ subtask, index, isLast }: { subtask: PlanSubtask; index: number; isLast: boolean }) {
  const cfg = SUBTASK_STATUS[subtask.status]
  const isActive = subtask.status === 'running' || subtask.status === 'review'

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07, duration: 0.18 }}
      className="flex items-start gap-0"
    >
      {/* Tree connector */}
      <div className="flex flex-col items-center flex-shrink-0 w-6 mr-2">
        <div className="w-px flex-1 bg-white/[0.06]" />
        <div className="w-3 h-px bg-white/[0.06] self-start mt-[14px]" />
        {!isLast && <div className="w-px flex-1 bg-white/[0.06]" />}
      </div>

      {/* Card */}
      <div className={cn(
        'flex-1 mb-2 rounded-xl border px-3 py-2.5',
        cfg.bg, cfg.border,
      )}>
        <div className="flex items-center gap-2.5">
          {/* Status dot */}
          <div className="relative flex-shrink-0">
            <div className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
            {isActive && (
              <motion.div
                className={cn('absolute inset-0 rounded-full', cfg.dot)}
                animate={{ scale: [1, 2.5, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>

          {/* Title */}
          <span className="text-[11px] font-mono text-slate-300 flex-1 min-w-0 truncate">
            {subtask.title}
          </span>

          {/* Dependency marker */}
          {subtask.dependsOn.length > 0 && (
            <span className="text-[8px] font-mono text-slate-700 flex-shrink-0">
              ← dep
            </span>
          )}
        </div>

        <div className="mt-1.5 flex items-center gap-3 text-[9px] font-mono">
          {/* Agent */}
          {subtask.assignedAgentName && (
            <span className={cn('font-semibold', ROLE_COLORS[subtask.role] ?? 'text-slate-400')}>
              {subtask.assignedAgentName}
            </span>
          )}

          {/* Branch */}
          {subtask.branch && (
            <div className="flex items-center gap-1 text-slate-700">
              <GitBranch size={7} />
              <span className="truncate max-w-[120px]">{subtask.branch}</span>
            </div>
          )}

          {/* Tests */}
          {subtask.testsPassed !== undefined && subtask.testsPassed > 0 && (
            <div className="flex items-center gap-1 text-emerald-600">
              <TestTube size={8} />
              <span>{subtask.testsPassed}p</span>
            </div>
          )}

          {/* Patch */}
          {subtask.patchVersion !== undefined && subtask.patchVersion > 0 && (
            <span className="text-slate-700">v{subtask.patchVersion}</span>
          )}

          {/* Status badge */}
          <span className={cn('ml-auto px-1.5 py-0.5 rounded border text-[8px]', cfg.bg, cfg.color, cfg.border)}>
            {cfg.label}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ── Blocker card ──────────────────────────────────────────────────────────────

function BlockerCard({ blocker, onEscalate }: { blocker: RuntimeBlocker; onEscalate: () => void }) {
  const cfg = BLOCKER_CONFIG[blocker.type]

  if (blocker.resolved) {
    return (
      <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-emerald-500/4 border border-emerald-500/10 opacity-60">
        <CheckCircle2 size={10} className="text-emerald-500 flex-shrink-0 mt-0.5" />
        <p className="text-[9px] font-mono text-emerald-700 flex-1 line-through leading-relaxed">
          {blocker.message}
        </p>
        <span className="text-[8px] font-mono text-emerald-800 flex-shrink-0">resolved</span>
      </div>
    )
  }

  return (
    <div className={cn('flex items-start gap-2 px-3 py-2.5 rounded-xl border', cfg.bg, cfg.border)}>
      <span className={cn('flex-shrink-0 mt-0.5', cfg.color)}>{cfg.icon}</span>
      <p className={cn('text-[9px] font-mono flex-1 leading-relaxed', cfg.color)}>
        {blocker.message}
      </p>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className="text-[8px] font-mono text-slate-700">
          {formatRelativeTime(blocker.detectedAt)}
        </span>
        {!blocker.escalatedToHuman ? (
          <button
            onClick={onEscalate}
            className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 border border-white/[0.06] transition-colors"
          >
            Escalate
          </button>
        ) : (
          <span className="text-[8px] font-mono text-amber-600 px-1.5 py-0.5">escalated</span>
        )}
      </div>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function RuntimePlanView() {
  const { runtimePlans, blockers, escalateBlocker } = useOrchestrator()
  const { runtimePlan: graphPlan, graphAvailable, loaded } = useTaskGraph()

  const activePlan =
    graphAvailable && loaded && graphPlan ? graphPlan : runtimePlans[0]
  const activeBlockers = blockers.filter(b => !b.resolved)
  const resolvedBlockers = blockers.filter(b => b.resolved)
  const progress = activePlan
    ? activePlan.subtasks.filter(s => s.status === 'done').length / activePlan.subtasks.length
    : 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {!activePlan ? (
        <div className="flex items-center justify-center h-40 text-[11px] font-mono text-slate-700">
          No active runtime plans
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">

          {/* Plan header */}
          <div className="glass rounded-2xl border border-white/[0.07] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.05]">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Network size={12} className="text-violet-400 flex-shrink-0" />
                    <span className="text-[13px] font-semibold text-slate-200 truncate">
                      {activePlan.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[9px] font-mono text-slate-700">
                    <span>
                      Planner: <span className="text-violet-300 font-semibold">{activePlan.plannerName}</span>
                    </span>
                    <span>·</span>
                    <span>{activePlan.workspaceName}</span>
                    <span>·</span>
                    <span>{activePlan.subtasks.length} subtasks</span>
                    <span>·</span>
                    <span>{formatRelativeTime(activePlan.createdAt)}</span>
                  </div>
                </div>

                {/* Human controls */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button className="flex items-center gap-1.5 text-[9px] font-mono px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-500 hover:text-slate-300 transition-colors">
                    Pause
                  </button>
                  <button className="flex items-center gap-1.5 text-[9px] font-mono px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15 transition-colors">
                    <CheckCircle2 size={9} />
                    Approve plan
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-[3px] bg-white/[0.05] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-violet-500/60 to-violet-400/80 rounded-full"
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>

              {/* Reasoning */}
              <p className="mt-3 text-[9px] font-mono text-slate-700 leading-relaxed italic">
                "{activePlan.reasoning}"
              </p>
            </div>

            {/* Subtask delegation chain */}
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="text-[9px] font-mono text-slate-700 uppercase tracking-widest">
                  Delegation chain
                </div>
                <ArrowDown size={9} className="text-slate-800" />
              </div>

              {/* Planner node */}
              <div className="flex items-center gap-2.5 px-3 py-2 mb-1 rounded-xl bg-violet-500/8 border border-violet-500/20">
                <div className="relative">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                  <motion.div
                    className="absolute inset-0 rounded-full bg-violet-500"
                    animate={{ scale: [1, 2.5, 1], opacity: [0.8, 0, 0.8] }}
                    transition={{ duration: 2.2, repeat: Infinity }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-violet-300">{activePlan.plannerName}</span>
                <span className="text-[9px] font-mono text-violet-700">planner · coordinating</span>
                <ChevronRight size={9} className="text-violet-800 ml-auto" />
              </div>

              {/* Arrow */}
              <div className="flex items-center gap-2 px-5 py-1">
                <div className="w-px h-3 bg-white/[0.06] ml-1.5" />
                <span className="text-[8px] font-mono text-slate-800">delegates</span>
              </div>

              {/* Subtask rows */}
              <div className="pl-4">
                <AnimatePresence>
                  {activePlan.subtasks.map((subtask, i) => (
                    <SubtaskRow
                      key={subtask.id}
                      subtask={subtask}
                      index={i}
                      isLast={i === activePlan.subtasks.length - 1}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Blockers */}
          <div className="glass rounded-2xl border border-white/[0.07] overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={11} className="text-amber-500" />
                <span className="text-[11px] font-mono text-slate-400">
                  Blockers
                </span>
                {activeBlockers.length > 0 && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                    {activeBlockers.length} active
                  </span>
                )}
              </div>
              {resolvedBlockers.length > 0 && (
                <span className="text-[9px] font-mono text-slate-700">
                  {resolvedBlockers.length} resolved
                </span>
              )}
            </div>
            <div className="p-4 space-y-2">
              {blockers.length === 0 ? (
                <div className="text-[11px] font-mono text-slate-700 text-center py-4">
                  No blockers detected
                </div>
              ) : (
                blockers.map(b => (
                  <BlockerCard key={b.id} blocker={b} onEscalate={() => escalateBlocker(b.id)} />
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
