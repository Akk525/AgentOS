import { motion } from 'framer-motion'
import {
  LayoutDashboard, KanbanSquare, Terminal, Bot, Zap,
  Plug, ScrollText, Settings, ChevronRight, Circle, FolderGit2, Cpu, Network, Map,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { DaemonStatusWidget } from '../runtime/RuntimeConnectionPanel'
import { useOrchestrator } from '../../context/OrchestratorContext'
import type { View } from '../../App'

interface NavItem {
  id: View
  label: string
  icon: React.ReactNode
  badge?: number
}

const STATIC_NAV: NavItem[] = [
  { id: 'dashboard',     label: 'Dashboard',     icon: <LayoutDashboard size={16} /> },
  { id: 'workspaces',    label: 'Workspaces',    icon: <FolderGit2 size={16} />, badge: 4 },
  { id: 'tasks',         label: 'Tasks',         icon: <KanbanSquare size={16} />, badge: 3 },
  { id: 'sessions',      label: 'Sessions',      icon: <Terminal size={16} />, badge: 1 },
  { id: 'orchestration', label: 'Orchestration', icon: <Network size={16} /> },
  { id: 'agents',        label: 'Agents',        icon: <Bot size={16} /> },
  { id: 'skills',        label: 'Skills',        icon: <Zap size={16} /> },
  { id: 'providers',     label: 'Providers',     icon: <Plug size={16} /> },
  { id: 'logs',          label: 'Logs',          icon: <ScrollText size={16} /> },
  { id: 'roadmap',       label: 'Roadmap',       icon: <Map size={16} /> },
  { id: 'runtime',       label: 'Runtime',       icon: <Cpu size={16} /> },
  { id: 'settings',      label: 'Settings',      icon: <Settings size={16} /> },
]

interface SidebarProps {
  activeView: View
  onViewChange: (view: View) => void
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const { activeSessions, runtimeQueue } = useOrchestrator()
  const activeCount = activeSessions.filter(s => s.status === 'running' || s.status === 'reviewing').length

  const navItems: NavItem[] = STATIC_NAV.map(item =>
    item.id === 'orchestration' ? { ...item, badge: activeSessions.length } : item
  )

  return (
    <div className="w-56 flex-shrink-0 flex flex-col h-full glass border-r border-white/[0.06] rounded-none">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-crimson-600 flex items-center justify-center shadow-[0_0_16px_rgba(244,63,94,0.4)]">
            <Circle size={12} className="text-white fill-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white tracking-tight">AgentOS</div>
            <div className="text-[10px] text-slate-500 font-mono">v2.1.0-alpha</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const isActive = activeView === item.id
          return (
            <motion.button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-150 text-left group',
                isActive
                  ? 'bg-crimson-500/10 text-crimson-400 border border-crimson-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              )}
            >
              <span className={cn('flex-shrink-0', isActive ? 'text-crimson-400' : 'text-slate-500 group-hover:text-slate-300')}>
                {item.icon}
              </span>
              <span className="flex-1 font-medium">{item.label}</span>
              {item.badge !== undefined && (
                <span className={cn(
                  'text-[10px] font-mono px-1.5 py-0.5 rounded-full',
                  isActive ? 'bg-crimson-500/20 text-crimson-400' : 'bg-white/5 text-slate-500'
                )}>
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronRight size={12} className="text-crimson-500/50" />}
            </motion.button>
          )
        })}
      </nav>

      {/* Runtime footer */}
      <div className="px-4 py-4 border-t border-white/[0.05]">
        <div className="text-[9px] text-slate-700 font-mono uppercase tracking-widest mb-2.5">Runtime</div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-600">Daemon</span>
            <DaemonStatusWidget />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-600">Active</span>
            <span className="text-[10px] text-cyan-500 font-mono">{activeCount} running</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-600">Queue</span>
            <span className="text-[10px] text-slate-500 font-mono">{runtimeQueue.length} waiting</span>
          </div>
        </div>
      </div>
    </div>
  )
}
