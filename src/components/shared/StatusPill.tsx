import { cn } from '../../lib/utils'
import type { TaskStatus, AgentStatus, ProviderStatus, TestStatus } from '../../types'

type Status = TaskStatus | AgentStatus | ProviderStatus | TestStatus

const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  backlog: { label: 'Backlog', dot: 'bg-slate-400', bg: 'bg-slate-500/10', text: 'text-slate-400' },
  claimed: { label: 'Claimed', dot: 'bg-violet-400', bg: 'bg-violet-500/10', text: 'text-violet-400' },
  running: { label: 'Running', dot: 'bg-cyan-400 animate-pulse', bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
  review: { label: 'Review', dot: 'bg-amber-400', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  needs_changes: { label: 'Needs Changes', dot: 'bg-orange-400', bg: 'bg-orange-500/10', text: 'text-orange-400' },
  done: { label: 'Done', dot: 'bg-emerald-400', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  failed: { label: 'Failed', dot: 'bg-crimson-500', bg: 'bg-crimson-500/10', text: 'text-crimson-400' },
  idle: { label: 'Idle', dot: 'bg-slate-400', bg: 'bg-slate-500/10', text: 'text-slate-400' },
  paused: { label: 'Paused', dot: 'bg-amber-400', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  error: { label: 'Error', dot: 'bg-crimson-500', bg: 'bg-crimson-500/10', text: 'text-crimson-400' },
  connected: { label: 'Connected', dot: 'bg-emerald-400', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  disconnected: { label: 'Disconnected', dot: 'bg-slate-400', bg: 'bg-slate-500/10', text: 'text-slate-400' },
  unconfigured: { label: 'Unconfigured', dot: 'bg-slate-600', bg: 'bg-slate-700/10', text: 'text-slate-500' },
  passing: { label: 'Passing', dot: 'bg-emerald-400', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  failing: { label: 'Failing', dot: 'bg-crimson-500', bg: 'bg-crimson-500/10', text: 'text-crimson-400' },
  pending: { label: 'Pending', dot: 'bg-amber-400 animate-pulse', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  skipped: { label: 'Skipped', dot: 'bg-slate-400', bg: 'bg-slate-500/10', text: 'text-slate-400' },
}

interface StatusPillProps {
  status: Status
  size?: 'sm' | 'md'
  className?: string
}

export function StatusPill({ status, size = 'sm', className }: StatusPillProps) {
  const config = statusConfig[status] ?? { label: status, dot: 'bg-slate-400', bg: 'bg-slate-500/10', text: 'text-slate-400' }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-mono',
        config.bg,
        config.text,
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        className
      )}
    >
      <span className={cn('rounded-full flex-shrink-0', config.dot, size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
      {config.label}
    </span>
  )
}
