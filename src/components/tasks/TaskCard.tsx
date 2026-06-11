import { motion } from 'framer-motion'
import { GitBranch, TestTube, Clock, AlertCircle, Zap, UserCheck, Loader2, Coins } from 'lucide-react'
import { StatusPill } from '../shared/StatusPill'
import { AgentAvatar } from '../shared/AgentAvatar'
import { useRuntime } from '../../context/RuntimeContext'
import { getTaskAgentDisplay } from '../../lib/taskAgent'
import { formatRuntime, formatRelativeTime } from '../../lib/utils'
import { cn } from '../../lib/utils'
import type { Task, RuntimePhase } from '../../types'

interface TaskCardProps {
  task: Task
  onClick: (task: Task) => void
  canRun?: boolean
  onRun?: (task: Task) => void
  isCoordinatorRunning?: boolean
}

const priorityAccent: Record<string, string> = {
  low: 'border-l-slate-700/60',
  medium: 'border-l-slate-600/60',
  high: 'border-l-amber-600/70',
  critical: 'border-l-crimson-600',
}

const statusGlow: Record<string, string> = {
  running: 'shadow-[0_0_24px_rgba(34,211,238,0.06)] border-cyan-500/[0.08]',
  review: 'shadow-[0_0_24px_rgba(251,191,36,0.05)] border-amber-500/[0.08]',
  needs_changes: 'border-orange-500/[0.08]',
  failed: 'border-crimson-500/[0.08]',
  done: 'opacity-60',
}

const riskColor = (score: number) => {
  if (score < 0.35) return 'text-emerald-500'
  if (score < 0.6) return 'text-amber-500'
  return 'text-crimson-400'
}

const phaseLabel: Partial<Record<RuntimePhase, string>> = {
  agent_replanning:   'replanning...',
  patch_updating:     'updating patch...',
  tests_rerunning:    'running tests...',
  ready_for_review:   'ready for review',
  human_controlled:   'manual control',
  paused:             'paused',
}

const phaseColor: Partial<Record<RuntimePhase, string>> = {
  agent_replanning:   'text-amber-400/80',
  patch_updating:     'text-violet-400/80',
  tests_rerunning:    'text-violet-400/80',
  ready_for_review:   'text-emerald-400/80',
  human_controlled:   'text-amber-300/80',
  paused:             'text-amber-500/60',
}

const phaseBarColor: Partial<Record<RuntimePhase, string>> = {
  agent_replanning:   'from-amber-700/50 to-amber-400/60',
  patch_updating:     'from-violet-700/50 to-violet-400/60',
  tests_rerunning:    'from-violet-700/50 to-cyan-400/60',
  ready_for_review:   'from-emerald-700/60 to-emerald-400/70',
}

export function TaskCard({ task, onClick, canRun = false, onRun, isCoordinatorRunning = false }: TaskCardProps) {
  const agent = getTaskAgentDisplay(task)
  const isRunning = task.status === 'running'
  const priority = task.priority ?? 'medium'
  const extraGlow = statusGlow[task.status] ?? ''

  const { runtimePhase, interventionCount, activeTaskId } = useRuntime()
  const isActiveRunning = isRunning && activeTaskId === task.id
  const currentPhase = isActiveRunning ? runtimePhase : 'autonomous_running'
  const activeLabel = phaseLabel[currentPhase] ?? 'executing'
  const activeLabelColor = phaseColor[currentPhase] ?? 'text-cyan-500/70'
  const activeBarClass = phaseBarColor[currentPhase] ?? 'from-cyan-600/60 to-cyan-300/70'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.12 } }}
      whileTap={{ scale: 0.985 }}
      onClick={() => onClick(task)}
      className={cn(
        'cursor-pointer rounded-xl overflow-hidden border-l-2',
        priorityAccent[priority],
        isRunning && 'running-border',
      )}
    >
      <div className={cn(
        'glass p-3.5 transition-all duration-200 hover:shadow-[0_10px_40px_rgba(0,0,0,0.4)]',
        extraGlow,
      )}>
        {/* Status + ID row */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <StatusPill status={task.status} />
          <span className="text-[9px] text-slate-700 font-mono tracking-wider">{task.id}</span>
        </div>

        {/* Title */}
        <h3 className={cn(
          'text-[13px] font-medium leading-snug mb-2 line-clamp-2',
          task.status === 'done' ? 'text-slate-500' : 'text-slate-100'
        )}>
          {task.title}
        </h3>

        {/* Description — hidden when running to give space to progress */}
        {!isRunning && (
          <p className="text-[11px] text-slate-600 leading-relaxed mb-3 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Running progress bar */}
        {isRunning && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                {currentPhase === 'human_controlled' && <UserCheck size={9} className="text-amber-400/70" />}
                {currentPhase === 'tests_rerunning' && <Loader2 size={9} className="text-violet-400/70 animate-spin" />}
                <motion.span
                  key={activeLabel}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`text-[10px] font-mono ${activeLabelColor}`}
                >
                  {activeLabel}
                </motion.span>
                {interventionCount > 0 && isActiveRunning && (
                  <span className="text-[9px] font-mono text-amber-600/70 bg-amber-500/10 px-1 rounded">
                    {interventionCount}× intervened
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-slate-600">{formatRuntime(task.runtimeSeconds ?? 0)}</span>
            </div>
            <div className="h-0.5 bg-white/[0.04] rounded-full overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${activeBarClass} rounded-full`}
                initial={{ width: '15%' }}
                animate={{ width: currentPhase === 'ready_for_review' ? '100%' : '78%' }}
                transition={{ duration: currentPhase === 'ready_for_review' ? 0.6 : 12, ease: [0.25, 0.1, 0.25, 1] }}
              />
            </div>
          </div>
        )}

        {/* Repo + branch */}
        <div className="flex items-center gap-1.5 text-[10px] text-slate-700 font-mono mb-2.5 truncate">
          <GitBranch size={9} className="flex-shrink-0 text-slate-700" />
          <span className="truncate">{task.branch}</span>
          <span className="text-slate-800 flex-shrink-0">·</span>
          <span className="text-slate-700 truncate">{task.repo.split('/').slice(-1)[0]}</span>
        </div>

        {/* Agent + metrics row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AgentAvatar role={agent.role} status={agent.status} size="sm" />
            <span className="text-[10px] text-slate-600 font-mono">{agent.name}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Tests */}
            {task.testStatus && task.testStatus !== 'pending' && task.testsPassed !== undefined && (
              <div className="flex items-center gap-1">
                <TestTube size={9} className={cn(
                  task.testStatus === 'passing' ? 'text-emerald-500' : 'text-crimson-500'
                )} />
                <span className={cn('text-[10px] font-mono',
                  task.testStatus === 'passing' ? 'text-emerald-500' : 'text-crimson-500'
                )}>
                  {task.testsPassed}p{task.testsFailed ? ` ${task.testsFailed}f` : ''}
                </span>
              </div>
            )}

            {/* Risk */}
            {task.riskScore !== undefined && task.riskScore > 0.15 && (
              <div className="flex items-center gap-0.5">
                <AlertCircle size={9} className={riskColor(task.riskScore)} />
                <span className={cn('text-[10px] font-mono', riskColor(task.riskScore))}>
                  {Math.round(task.riskScore * 100)}%
                </span>
              </div>
            )}

            {/* Runtime or age */}
            {!isRunning && (
              task.runtimeSeconds !== undefined && task.runtimeSeconds > 0 ? (
                <div className="flex items-center gap-0.5 text-[10px] text-slate-700 font-mono">
                  <Clock size={9} />
                  <span>{formatRuntime(task.runtimeSeconds)}</span>
                </div>
              ) : (
                <span className="text-[10px] text-slate-700 font-mono">{formatRelativeTime(task.createdAt)}</span>
              )
            )}
          </div>
        </div>

        {/* Confidence bar for review tasks */}
        {task.status === 'review' && task.confidenceScore !== undefined && (
          <div className="mt-3 flex items-center gap-2">
            <Zap size={9} className="text-amber-500/70 flex-shrink-0" />
            <div className="flex-1 h-0.5 bg-white/[0.05] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-amber-500/50 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${task.confidenceScore * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <span className="text-[10px] font-mono text-amber-500/70">{Math.round(task.confidenceScore * 100)}%</span>
          </div>
        )}

        {(task.costUsd !== undefined || task.epicCostUsd !== undefined) && (
          <div className="mt-2 flex items-center gap-2 text-[9px] font-mono text-slate-600">
            <Coins size={8} className="text-amber-700/80" />
            {task.costUsd !== undefined && <span>${task.costUsd.toFixed(3)} task</span>}
            {task.epicCostUsd !== undefined && (
              <span className="text-slate-700">${task.epicCostUsd.toFixed(3)} epic</span>
            )}
          </div>
        )}

        {/* Tags + run */}
        <div className="flex items-center justify-between mt-2.5 gap-2">
          {task.tags && task.tags.length > 0 && !isRunning ? (
            <div className="flex items-center gap-1 flex-wrap flex-1">
              {task.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-white/[0.03] text-slate-700 border border-white/[0.04]"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : <div className="flex-1" />}
          {canRun && onRun && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                onRun(task)
              }}
              disabled={isCoordinatorRunning}
              className="text-[9px] font-mono px-2 py-1 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 hover:bg-cyan-500/25 disabled:opacity-40"
            >
              Run
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
