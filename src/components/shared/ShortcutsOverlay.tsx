import { motion } from 'framer-motion'
import { X } from 'lucide-react'

interface ShortcutRow {
  keys: string[]
  description: string
}

interface ShortcutGroup {
  label: string
  rows: ShortcutRow[]
}

const GROUPS: ShortcutGroup[] = [
  {
    label: 'General',
    rows: [
      { keys: ['⌘', 'K'],   description: 'Open command palette' },
      { keys: ['?'],         description: 'Show keyboard shortcuts' },
      { keys: ['Esc'],       description: 'Close / dismiss' },
    ],
  },
  {
    label: 'Sessions',
    rows: [
      { keys: ['⌃', 'S'],   description: 'Spawn new session' },
      { keys: ['⌘', 'N'],   description: 'Create new task' },
    ],
  },
  {
    label: 'Runtime',
    rows: [
      { keys: ['⌃', 'R'],   description: 'Ping all providers' },
      { keys: ['⌃', 'D'],   description: 'Run diagnostics' },
    ],
  },
  {
    label: 'Navigation',
    rows: [
      { keys: ['⌘', 'K'],   description: 'Search views via command palette' },
      { keys: ['⌘', '1–9'], description: 'Jump to numbered sidebar item' },
    ],
  },
]

function Kbd({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded bg-white/[0.07] border border-white/[0.10] text-[10px] font-mono text-slate-400">
      {children}
    </span>
  )
}

interface ShortcutsOverlayProps {
  onClose: () => void
}

export function ShortcutsOverlay({ onClose }: ShortcutsOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center"
      style={{ background: 'rgba(6,6,10,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18 }}
        className="glass rounded-2xl border border-white/[0.08] w-[400px] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <div className="text-[12px] font-semibold text-slate-200">Keyboard shortcuts</div>
            <div className="text-[9px] font-mono text-slate-700 mt-0.5">AgentOS v1.1</div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-700 hover:text-slate-400 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Groups */}
        <div className="p-4 space-y-5">
          {GROUPS.map(group => (
            <div key={group.label}>
              <div className="text-[9px] font-mono text-slate-700 uppercase tracking-widest mb-2.5">
                {group.label}
              </div>
              <div className="space-y-2">
                {group.rows.map(row => (
                  <div key={row.description} className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-500">{row.description}</span>
                    <div className="flex items-center gap-1">
                      {row.keys.map((k, i) => <Kbd key={i}>{k}</Kbd>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-white/[0.05] text-[9px] font-mono text-slate-800 text-center">
          Press <span className="text-slate-600">Esc</span> or click outside to close
        </div>
      </motion.div>
    </motion.div>
  )
}
