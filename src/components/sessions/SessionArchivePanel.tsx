import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, XCircle, AlertTriangle, Archive,
  ChevronRight, GitBranch, RotateCcw, FileCode,
  ChevronDown, FolderGit2,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { mockSessionArchive } from '../../data/mockSessionArchive'
import { formatRelativeTime } from '../../lib/utils'
import type { SessionArchive, SessionOutcome } from '../../types'

const outcomeConfig: Record<SessionOutcome, { icon: React.ReactNode; color: string; label: string }> = {
  completed: { icon: <CheckCircle2 size={9} />, color: 'text-emerald-500', label: 'done'      },
  failed:    { icon: <XCircle size={9} />,       color: 'text-crimson-500', label: 'failed'    },
  abandoned: { icon: <AlertTriangle size={9} />, color: 'text-amber-500',   label: 'abandoned' },
  in_review: { icon: <ChevronRight size={9} />,  color: 'text-cyan-500',    label: 'review'    },
}

function formatDuration(seconds: number): string {
  if (seconds < 60)   return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}m`
}

function SessionRow({ session }: { session: SessionArchive }) {
  const [hovered, setHovered] = useState(false)
  const cfg = outcomeConfig[session.outcome]

  return (
    <motion.div
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative"
    >
      <div className={cn(
        'px-2 py-2 rounded-lg transition-colors',
        hovered ? 'bg-white/[0.03]' : '',
      )}>
        <div className="flex items-start gap-2">
          <div className={cn('flex-shrink-0 mt-0.5', cfg.color)}>{cfg.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono text-slate-500 truncate group-hover:text-slate-400 transition-colors">
              {session.taskTitle}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-[9px] font-mono text-slate-700">
              <GitBranch size={7} />
              <span className="truncate max-w-[90px]">{session.branch}</span>
              <span className="text-slate-800">·</span>
              <span>{formatDuration(session.durationSeconds)}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[9px] font-mono text-slate-800">
              <span>v{session.patchVersion}</span>
              {session.interventionCount > 0 && (
                <span className="text-amber-700">{session.interventionCount}× int</span>
              )}
              <span className="ml-auto">{formatRelativeTime(session.endedAt)}</span>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.12 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.04] mt-1.5">
                {session.outcome === 'in_review' && (
                  <button className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-mono text-cyan-600 bg-cyan-500/8 border border-cyan-500/20 hover:border-cyan-500/35 transition-colors">
                    <FileCode size={7} />
                    Review
                  </button>
                )}
                <button className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-mono text-slate-600 border border-white/[0.07] hover:border-white/[0.12] hover:text-slate-400 transition-colors">
                  <RotateCcw size={7} />
                  Replay
                </button>
                <button className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-mono text-slate-600 border border-white/[0.07] hover:border-white/[0.12] hover:text-slate-400 transition-colors">
                  <FolderGit2 size={7} />
                  Restore
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function WorkspaceGroup({ name, sessions }: { name: string; sessions: SessionArchive[] }) {
  const [open, setOpen] = useState(true)

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-1.5 px-2 py-1 text-[9px] font-mono text-slate-700 hover:text-slate-500 transition-colors"
      >
        <ChevronDown size={8} className={cn('transition-transform', !open && '-rotate-90')} />
        <FolderGit2 size={8} />
        <span className="uppercase tracking-widest">{name}</span>
        <span className="ml-auto text-slate-800">{sessions.length}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden px-1 space-y-0.5"
          >
            {sessions.map(s => <SessionRow key={s.id} session={s} />)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function SessionArchivePanel() {
  // Group by workspace
  const groups = mockSessionArchive.reduce<Record<string, SessionArchive[]>>((acc, s) => {
    ;(acc[s.workspaceName] ??= []).push(s)
    return acc
  }, {})

  return (
    <div className="border-t border-white/[0.04]">
      <div className="px-4 py-3 flex items-center gap-1.5">
        <Archive size={10} className="text-slate-600" />
        <span className="text-[9px] text-slate-700 font-mono uppercase tracking-widest flex-1">Session History</span>
        <span className="text-[9px] font-mono text-slate-800">{mockSessionArchive.length}</span>
      </div>

      <div className="pb-3 space-y-2">
        {Object.entries(groups).map(([ws, sessions]) => (
          <WorkspaceGroup key={ws} name={ws} sessions={sessions} />
        ))}
      </div>
    </div>
  )
}
