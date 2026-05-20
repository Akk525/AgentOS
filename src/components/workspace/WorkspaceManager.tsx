import { useState } from 'react'
import { motion } from 'framer-motion'
import { FolderGit2, Plus, RefreshCw, Activity } from 'lucide-react'
import { WorkspaceCard } from './WorkspaceCard'
import { mockWorkspaces } from '../../data/mockWorkspaces'
import type { Workspace } from '../../types'

interface WorkspaceManagerProps {
  onMountWorkspace?: () => void
  onSpawnSession?: (workspaceId?: string) => void
}

export function WorkspaceManager({ onMountWorkspace, onSpawnSession }: WorkspaceManagerProps) {
  const [workspaces] = useState<Workspace[]>(mockWorkspaces)

  const activeCount = workspaces.filter(ws => ws.activeSessions > 0).length
  const healthyCount = workspaces.filter(ws => ws.healthStatus === 'healthy').length
  const totalWorktrees = workspaces.reduce((acc, ws) => acc + ws.worktrees.length, 0)
  const activeWorktrees = workspaces.reduce(
    (acc, ws) => acc + ws.worktrees.filter(wt => wt.status === 'active').length,
    0,
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/[0.04] flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <FolderGit2 size={15} className="text-slate-500" />
            <h1 className="text-[14px] font-semibold text-slate-200 tracking-tight">Workspaces</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono text-slate-600 hover:text-slate-400 hover:bg-white/[0.04] border border-white/[0.05] transition-all">
              <RefreshCw size={9} />
              Refresh
            </button>
            <button
              onClick={onMountWorkspace}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/35 transition-all"
            >
              <Plus size={10} />
              Mount workspace
            </button>
          </div>
        </div>

        {/* Runtime summary strip */}
        <div className="flex items-center gap-4">
          <StatPill label="workspaces" value={workspaces.length} />
          <StatPill label="active" value={activeCount} accent="cyan" />
          <StatPill label="healthy" value={healthyCount} accent="emerald" />
          <div className="h-3 w-px bg-white/[0.06]" />
          <StatPill label="worktrees" value={totalWorktrees} />
          <div className="flex items-center gap-1 text-[9px] font-mono text-slate-700">
            <Activity size={8} className={activeWorktrees > 0 ? 'text-cyan-600' : ''} />
            <span className={activeWorktrees > 0 ? 'text-cyan-600' : ''}>
              {activeWorktrees} running
            </span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
        {workspaces.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div
            className="grid grid-cols-2 gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {workspaces.map((ws, i) => (
              <motion.div
                key={ws.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: i * 0.05 }}
              >
                <WorkspaceCard
                  workspace={ws}
                  onOpenSession={handleOpenSession}
                  onSpawnSession={ws => onSpawnSession?.(ws.id)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}

function handleOpenSession(_ws: Workspace) {
  // TODO: navigate to sessions view with this workspace selected
}

function StatPill({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: 'cyan' | 'emerald'
}) {
  const valueColor =
    accent === 'cyan'
      ? 'text-cyan-500'
      : accent === 'emerald'
      ? 'text-emerald-500'
      : 'text-slate-400'

  return (
    <div className="flex items-center gap-1 text-[9px] font-mono">
      <span className={valueColor}>{value}</span>
      <span className="text-slate-700">{label}</span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
      <FolderGit2 size={22} className="text-slate-800" />
      <div>
        <p className="text-[11px] text-slate-600 font-mono">No workspaces connected</p>
        <p className="text-[10px] text-slate-700 mt-0.5">Add a repository to get started</p>
      </div>
    </div>
  )
}
