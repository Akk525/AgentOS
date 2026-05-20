import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitBranch, AlertTriangle, WifiOff, Zap,
  FolderGit2, Clock, ExternalLink, Terminal,
  TerminalSquare, Copy, HardDrive, CheckCircle2, Plus,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { mockAgents } from '../../data/mockAgents'
import { formatRelativeTime } from '../../lib/utils'
import { useRuntime } from '../../context/RuntimeContext'
import type { Workspace, WorktreeEntry, WorkspaceHealth, WorktreeStatus, MountState } from '../../types'

const healthConfig: Record<WorkspaceHealth, { dot: string; label: string; labelColor: string }> = {
  healthy:  { dot: 'bg-emerald-400',  label: 'healthy',  labelColor: 'text-emerald-500' },
  degraded: { dot: 'bg-amber-400',    label: 'degraded', labelColor: 'text-amber-500' },
  error:    { dot: 'bg-crimson-400',  label: 'error',    labelColor: 'text-crimson-400' },
  offline:  { dot: 'bg-slate-600',    label: 'offline',  labelColor: 'text-slate-600' },
}

const worktreeStatusConfig: Record<WorktreeStatus, { dot: string; label: string }> = {
  active: { dot: 'bg-cyan-400',    label: 'running' },
  idle:   { dot: 'bg-slate-600',   label: 'idle' },
  stale:  { dot: 'bg-amber-600',   label: 'stale' },
  error:  { dot: 'bg-crimson-500', label: 'error' },
}

const mountConfig: Record<MountState, { label: string; color: string; dot: string }> = {
  mounting:   { label: 'mounting…', color: 'text-amber-500', dot: 'bg-amber-400' },
  mounted:    { label: 'mounted',   color: 'text-emerald-500', dot: 'bg-emerald-400' },
  unmounting: { label: 'detaching', color: 'text-slate-500', dot: 'bg-slate-500' },
  unmounted:  { label: 'unmounted', color: 'text-slate-700', dot: 'bg-slate-700' },
  error:      { label: 'error',     color: 'text-crimson-500', dot: 'bg-crimson-500' },
}

function WorktreeRow({ wt }: { wt: WorktreeEntry }) {
  const agent = wt.assignedAgentId ? mockAgents.find(a => a.id === wt.assignedAgentId) : null
  const cfg = worktreeStatusConfig[wt.status]
  const isActive = wt.status === 'active'

  return (
    <div className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-white/[0.03] transition-colors group/wt">
      <GitBranch size={9} className="text-slate-700 flex-shrink-0" />
      <span className="text-[10px] font-mono text-slate-500 flex-1 truncate">{wt.branch}</span>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {wt.interventionCount > 0 && (
          <span className="text-[8px] font-mono text-amber-600/70 bg-amber-500/10 px-1 rounded">
            {wt.interventionCount}×
          </span>
        )}
        {agent && (
          <span className="text-[9px] font-mono text-slate-700 hidden group-hover/wt:inline">
            {agent.name.split(' ')[0]}
          </span>
        )}
        <div className="relative">
          <div className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
          {isActive && (
            <motion.div
              className={cn('absolute inset-0 rounded-full', cfg.dot)}
              animate={{ scale: [1, 2, 1], opacity: [0.8, 0, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

interface WorkspaceCardProps {
  workspace: Workspace
  onOpenSession: (ws: Workspace) => void
  onSpawnSession?: (ws: Workspace) => void
}

export function WorkspaceCard({ workspace: ws, onOpenSession, onSpawnSession }: WorkspaceCardProps) {
  const [hovered, setHovered] = useState(false)
  const [copied, setCopied] = useState(false)
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)
  const { mountedWorkspaces, mountWorkspace, dismissNotification: _ } = useRuntime()
  const health = healthConfig[ws.healthStatus]
  const activeWorktrees = ws.worktrees.filter(wt => wt.status === 'active')

  const mountStatus = mountedWorkspaces.find(m => m.workspaceId === ws.id)
  const mountState = mountStatus?.mountState ?? 'unmounted'
  const isMounted = mountState === 'mounted'
  const isMounting = mountState === 'mounting'

  const showFeedback = (msg: string) => {
    setActionFeedback(msg)
    setTimeout(() => setActionFeedback(null), 2000)
  }

  const handleCopyPath = () => {
    setCopied(true)
    showFeedback('Path copied')
    setTimeout(() => setCopied(false), 1500)
  }

  const handleOpenTerminal = () => showFeedback('Opening terminal…')
  const handleReveal = () => showFeedback('Revealing in Finder…')
  const handleMount = () => {
    if (!isMounted && !isMounting) mountWorkspace(ws.id, ws.rootPath)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={cn(
        'glass rounded-2xl overflow-hidden border transition-all duration-200',
        ws.healthStatus === 'healthy' && activeWorktrees.length > 0
          ? 'border-cyan-500/[0.08] shadow-[0_0_24px_rgba(34,211,238,0.04)]'
          : ws.healthStatus === 'degraded'
          ? 'border-amber-500/[0.08]'
          : ws.healthStatus === 'error'
          ? 'border-crimson-500/[0.08]'
          : 'border-white/[0.05]',
      )}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.04]">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <FolderGit2 size={14} className="text-slate-600 flex-shrink-0" />
            <span className="text-[13px] font-semibold text-slate-100 truncate">{ws.name}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {ws.healthStatus === 'degraded' && <AlertTriangle size={11} className="text-amber-500/70" />}
            {ws.healthStatus === 'error' && <AlertTriangle size={11} className="text-crimson-400" />}
            {ws.healthStatus === 'offline' && <WifiOff size={11} className="text-slate-600" />}
            <div className={cn('w-1.5 h-1.5 rounded-full', health.dot)} />
            <span className={cn('text-[9px] font-mono', health.labelColor)}>{health.label}</span>
          </div>
        </div>

        <div className="text-[10px] font-mono text-slate-600 truncate mb-1">{ws.repo}</div>
        <div
          className="text-[10px] font-mono text-slate-700 truncate cursor-pointer hover:text-slate-500 transition-colors flex items-center gap-1 group/path"
          onClick={handleCopyPath}
        >
          <span className="truncate">{ws.rootPath}</span>
          <Copy size={8} className={cn('flex-shrink-0 opacity-0 group-hover/path:opacity-100 transition-opacity', copied && 'text-emerald-500 opacity-100')} />
        </div>

        <div className="flex items-center gap-3 mt-2.5">
          <span className="text-[10px] font-mono text-slate-700 bg-white/[0.04] px-2 py-0.5 rounded-md">
            {ws.provider}
          </span>
          <span className="text-[9px] font-mono text-slate-700">{ws.model.split('-').slice(-2).join('-')}</span>

          {/* Mount indicator */}
          {(isMounted || isMounting) && (
            <div className="flex items-center gap-1">
              <motion.div
                className={cn('w-1 h-1 rounded-full', mountConfig[mountState].dot)}
                animate={isMounting ? { opacity: [1, 0.3, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className={cn('text-[9px] font-mono', mountConfig[mountState].color)}>
                {mountConfig[mountState].label}
              </span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-1 text-[9px] font-mono text-slate-700">
            <Clock size={8} />
            <span>{formatRelativeTime(ws.lastActivity)}</span>
          </div>
        </div>
      </div>

      {/* Worktrees */}
      <div className="px-2 py-2">
        {ws.worktrees.length === 0 ? (
          <div className="px-2 py-3 text-[10px] text-slate-700 font-mono text-center">
            No active worktrees
          </div>
        ) : (
          <div className="space-y-0.5">
            {ws.worktrees.map(wt => (
              <WorktreeRow key={wt.id} wt={wt} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-3 pt-1 border-t border-white/[0.04]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-700">
            {ws.activeSessions > 0 && (
              <div className="flex items-center gap-1 text-cyan-600">
                <Zap size={9} />
                <span>{ws.activeSessions} active</span>
              </div>
            )}
            {isMounted && mountStatus?.filesystemAccess && (
              <div className="flex items-center gap-1 text-emerald-700">
                <HardDrive size={9} />
                <span>fs</span>
              </div>
            )}
            {isMounted && mountStatus?.terminalAvailable && (
              <div className="flex items-center gap-1 text-emerald-700">
                <TerminalSquare size={9} />
                <span>term</span>
              </div>
            )}
            <span>{ws.totalTasks} tasks</span>
          </div>

          {/* Action feedback */}
          <AnimatePresence mode="wait">
            {actionFeedback ? (
              <motion.div
                key="feedback"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-1 text-[9px] font-mono text-emerald-500"
              >
                <CheckCircle2 size={9} />
                {actionFeedback}
              </motion.div>
            ) : hovered ? (
              <motion.div
                key="actions"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1"
              >
                {!isMounted && !isMounting && (
                  <button
                    onClick={handleMount}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-mono text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/8 border border-white/[0.05] hover:border-emerald-500/20 transition-all"
                  >
                    <HardDrive size={8} />
                    Mount
                  </button>
                )}
                {isMounted && (
                  <button
                    onClick={handleOpenTerminal}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-mono text-slate-600 hover:text-slate-300 hover:bg-white/[0.04] border border-white/[0.05] transition-all"
                  >
                    <TerminalSquare size={8} />
                    Terminal
                  </button>
                )}
                <button
                  onClick={() => onSpawnSession?.(ws)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono bg-emerald-500/8 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/35 transition-all"
                >
                  <Plus size={9} />
                  Spawn
                </button>
                <button
                  onClick={() => onOpenSession(ws)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/35 transition-all"
                >
                  <Terminal size={9} />
                  Open
                </button>
                <button
                  onClick={handleReveal}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono text-slate-600 hover:text-slate-400 hover:bg-white/[0.04] transition-all"
                >
                  <ExternalLink size={9} />
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
