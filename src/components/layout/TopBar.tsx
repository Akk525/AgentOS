import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Bell, Command, ChevronRight, X } from 'lucide-react'
import { GlowButton } from '../shared/GlowButton'
import type { View } from '../../App'

interface TopBarProps {
  activeView: View
  onNewProject: () => void
}

const breadcrumbLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  tasks: 'Task Board',
  sessions: 'Agent Sessions',
  agents: 'Agents',
  skills: 'Skills',
  providers: 'Providers',
  logs: 'Logs',
  settings: 'Settings',
}

export function TopBar({ activeView, onNewProject }: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  return (
    <div className="h-14 flex-shrink-0 flex items-center justify-between px-5 glass border-b border-white/[0.06] rounded-none">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-600 font-mono text-xs">agentos</span>
        <ChevronRight size={12} className="text-slate-700" />
        <span className="text-slate-200 font-medium">{breadcrumbLabels[activeView] ?? activeView}</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <AnimatePresence>
          {searchOpen ? (
            <motion.div
              key="search-open"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-1.5">
                <Search size={14} className="text-slate-500 flex-shrink-0" />
                <input
                  autoFocus
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search tasks, agents, repos..."
                  className="bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none flex-1 font-mono"
                />
                <button onClick={() => setSearchOpen(false)}>
                  <X size={12} className="text-slate-600 hover:text-slate-400" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="search-closed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setSearchOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-colors"
            >
              <Search size={15} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Command palette hint */}
        <button className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-600 hover:text-slate-400 transition-colors">
          <Command size={12} />
          <span className="text-[11px] font-mono">K</span>
        </button>

        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-colors">
          <Bell size={15} />
          <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-crimson-500" />
        </button>

        <div className="w-px h-5 bg-white/[0.08]" />

        {/* New Project */}
        <GlowButton variant="primary" size="sm" icon={<Plus size={14} />} onClick={onNewProject}>
          New Project
        </GlowButton>
      </div>
    </div>
  )
}
