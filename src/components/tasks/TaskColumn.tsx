import { motion } from 'framer-motion'
import { TaskCard } from './TaskCard'
import { cn } from '../../lib/utils'
import type { Task, TaskStatus } from '../../types'

interface ColumnConfig {
  id: TaskStatus
  label: string
  accent: string
  countColor: string
}

const columnConfig: Record<TaskStatus, ColumnConfig> = {
  backlog: { id: 'backlog', label: 'Backlog', accent: 'border-slate-700/50', countColor: 'text-slate-500' },
  claimed: { id: 'claimed', label: 'Claimed', accent: 'border-violet-700/40', countColor: 'text-violet-400' },
  running: { id: 'running', label: 'Running', accent: 'border-cyan-700/40', countColor: 'text-cyan-400' },
  review: { id: 'review', label: 'Review', accent: 'border-amber-700/40', countColor: 'text-amber-400' },
  needs_changes: { id: 'needs_changes', label: 'Needs Changes', accent: 'border-orange-700/40', countColor: 'text-orange-400' },
  done: { id: 'done', label: 'Done', accent: 'border-emerald-800/40', countColor: 'text-emerald-500' },
  failed: { id: 'failed', label: 'Failed', accent: 'border-crimson-800/40', countColor: 'text-crimson-500' },
}

interface TaskColumnProps {
  status: TaskStatus
  tasks: Task[]
  onTaskClick: (task: Task) => void
}

export function TaskColumn({ status, tasks, onTaskClick }: TaskColumnProps) {
  const config = columnConfig[status]

  return (
    <div className="flex flex-col min-w-[240px] w-[240px] flex-shrink-0 h-full">
      {/* Column header */}
      <div className={cn('flex items-center justify-between mb-3 px-1')}>
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-sm', {
            'bg-slate-600': status === 'backlog',
            'bg-violet-500': status === 'claimed',
            'bg-cyan-500': status === 'running',
            'bg-amber-500': status === 'review',
            'bg-orange-500': status === 'needs_changes',
            'bg-emerald-600': status === 'done',
            'bg-crimson-600': status === 'failed',
          })} />
          <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">{config.label}</span>
        </div>
        <span className={cn('text-xs font-mono font-semibold', config.countColor)}>
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div className={cn(
        'flex-1 overflow-y-auto scrollbar-thin space-y-2.5 pr-0.5 pb-2',
        'border-t pt-3',
        config.accent,
      )}>
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-20 rounded-xl border border-dashed border-white/[0.04] text-slate-700 text-xs font-mono">
            empty
          </div>
        ) : (
          <motion.div
            initial={false}
            className="space-y-2.5"
          >
            {tasks.map(task => (
              <TaskCard key={task.id} task={task} onClick={onTaskClick} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
