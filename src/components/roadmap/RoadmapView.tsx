import { motion } from 'framer-motion'
import { CheckCircle2, Circle, Clock } from 'lucide-react'
import { cn } from '../../lib/utils'
import { ROADMAP_PHASES, type RoadmapPhase, type PhaseStatus } from '../../data/roadmapPhases'

const STATUS_CONFIG: Record<PhaseStatus, {
  badge: string; badgeText: string; dot: React.ReactNode; opacity: string
}> = {
  done: {
    badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    badgeText: 'Done',
    dot: <CheckCircle2 size={14} className="text-emerald-500" />,
    opacity: 'opacity-70',
  },
  current: {
    badge: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
    badgeText: 'Current',
    dot: <Circle size={14} className="text-violet-400 fill-violet-400" />,
    opacity: 'opacity-100',
  },
  upcoming: {
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    badgeText: 'Upcoming',
    dot: <Clock size={14} className="text-cyan-500" />,
    opacity: 'opacity-80',
  },
  future: {
    badge: 'bg-slate-500/8 text-slate-500 border-slate-500/15',
    badgeText: 'Future',
    dot: <Circle size={14} className="text-slate-700" />,
    opacity: 'opacity-50',
  },
}

function PhaseCard({ phase, index, total }: { phase: RoadmapPhase; index: number; total: number }) {
  const cfg = STATUS_CONFIG[phase.status]
  const isCurrent = phase.status === 'current'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.18 }}
      className={cn('flex gap-4', cfg.opacity)}
    >
      <div className="flex flex-col items-center flex-shrink-0 pt-1">
        {cfg.dot}
        {index < total - 1 && (
          <div className={cn(
            'w-px flex-1 mt-2',
            isCurrent ? 'bg-violet-500/20' : 'bg-white/[0.04]',
          )} />
        )}
      </div>

      <div className={cn(
        'flex-1 pb-6 rounded-2xl',
        isCurrent ? 'glass border border-violet-500/15 p-4 -mt-1 mb-2' : '',
      )}>
        <div className="flex items-center gap-2.5 mb-1.5">
          <span className="text-[11px] font-mono text-slate-700">{phase.version}</span>
          <span className={cn('text-[9px] font-mono px-1.5 py-0.5 rounded border', cfg.badge)}>
            {cfg.badgeText}
          </span>
          {isCurrent && (
            <motion.span
              className="text-[8px] font-mono text-violet-500"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ● in progress
            </motion.span>
          )}
        </div>

        <div className="text-[14px] font-semibold text-slate-200 mb-1">{phase.title}</div>
        <p className="text-[11px] font-mono text-slate-600 mb-3 leading-relaxed">
          {phase.description}
        </p>

        <ul className="space-y-1">
          {phase.items.map(item => (
            <li key={item} className="flex items-start gap-2 text-[10px] font-mono text-slate-700">
              <span className="text-slate-800 mt-0.5 flex-shrink-0">—</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  )
}

export function RoadmapView() {
  const done = ROADMAP_PHASES.filter(p => p.status === 'done').length
  const total = ROADMAP_PHASES.length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.05] flex-shrink-0">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[9px] font-mono text-slate-700 uppercase tracking-widest mb-1">
              Roadmap
            </div>
            <div className="text-[15px] font-semibold text-slate-200">
              AgentOS development plan
            </div>
            <p className="text-[11px] font-mono text-slate-600 mt-0.5">
              Pillar-based phases toward Year 1 and Year 2 success.
            </p>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-mono text-slate-700 mb-1">progress</div>
            <div className="text-[20px] font-semibold text-slate-300">
              {done}
              <span className="text-[13px] text-slate-700">/{total}</span>
            </div>
            <div className="text-[9px] font-mono text-slate-700">phases complete</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5">
        {ROADMAP_PHASES.map((phase, i) => (
          <PhaseCard key={phase.version} phase={phase} index={i} total={total} />
        ))}

        <div className="pt-4 pb-8 text-center text-[9px] font-mono text-slate-800">
          Full plan: docs/ROADMAP.md · Vision: docs/PRD.md
        </div>
      </div>
    </div>
  )
}
