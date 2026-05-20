import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Terminal, Play, Pause, GitBranch, Zap,
  FolderGit2, MessageSquarePlus, RotateCcw, ChevronRight,
  RefreshCw, HardDrive, Shield, Archive, Cpu,
  TerminalSquare, Globe, Clock, Activity, FolderSearch, ScrollText,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useRuntime } from '../../context/RuntimeContext'
import type { View } from '../../App'

interface CommandDef {
  id: string
  label: string
  description: string
  group: string
  icon: React.ReactNode
  shortcut?: string
  requiresInput?: boolean
  inputPlaceholder?: string
  action?: () => void
}

const RECENT_COMMAND_IDS = ['cmd-inject', 'cmd-rerun', 'cmd-pause']

function buildCommands(
  runtime: ReturnType<typeof useRuntime>,
  onViewChange?: (view: View) => void,
  onSpawnSession?: () => void,
): CommandDef[] {
  return [
    // Session
    {
      id: 'cmd-spawn',
      label: 'Spawn session',
      description: 'Launch a new isolated agent session on a workspace',
      group: 'Session',
      icon: <Zap size={11} />,
      shortcut: '⌃S',
      action: () => onSpawnSession?.(),
    },
    {
      id: 'cmd-pause',
      label: 'Pause session',
      description: 'Pause the current agent session',
      group: 'Session',
      icon: <Pause size={11} />,
      shortcut: '⌃P',
      action: () => runtime.setSessionMode('paused'),
    },
    {
      id: 'cmd-resume',
      label: 'Resume session',
      description: 'Resume autonomous agent execution',
      group: 'Session',
      icon: <Play size={11} />,
      action: () => runtime.setSessionMode('autonomous'),
    },
    {
      id: 'cmd-takeover',
      label: 'Take control',
      description: 'Switch to human-controlled mode',
      group: 'Session',
      icon: <Terminal size={11} />,
      shortcut: '⌃T',
      action: () => runtime.setSessionMode('human_controlled'),
    },
    {
      id: 'cmd-return',
      label: 'Return to agent',
      description: 'Hand control back to the agent',
      group: 'Session',
      icon: <Zap size={11} />,
      action: () => runtime.setSessionMode('autonomous'),
    },
    // Agent
    {
      id: 'cmd-inject',
      label: 'Inject instruction',
      description: 'Send a directive to the agent mid-run',
      group: 'Agent',
      icon: <MessageSquarePlus size={11} />,
      shortcut: '⌃I',
      requiresInput: true,
      inputPlaceholder: 'e.g. "focus on the auth module first"',
    },
    {
      id: 'cmd-rerun',
      label: 'Rerun tests',
      description: 'Trigger a fresh test run',
      group: 'Agent',
      icon: <RotateCcw size={11} />,
      action: () => runtime.runTerminalCommand('npm test'),
    },
    {
      id: 'cmd-create-worktree',
      label: 'Create worktree',
      description: 'Create an isolated git worktree on a new branch',
      group: 'Agent',
      icon: <GitBranch size={11} />,
      requiresInput: true,
      inputPlaceholder: 'Branch name (e.g. fix/auth-race)',
    },
    // Workspaces
    {
      id: 'cmd-mount',
      label: 'Mount workspace',
      description: 'Attach a local repository to the runtime',
      group: 'Workspaces',
      icon: <HardDrive size={11} />,
      requiresInput: true,
      inputPlaceholder: '~/path/to/repo',
    },
    {
      id: 'cmd-ws-boilerbyte',
      label: 'Open boilerbyte',
      description: 'Switch to boilerbyte workspace',
      group: 'Workspaces',
      icon: <FolderGit2 size={11} />,
    },
    {
      id: 'cmd-ws-clauseguard',
      label: 'Open clauseguard',
      description: 'Switch to clauseguard workspace',
      group: 'Workspaces',
      icon: <FolderGit2 size={11} />,
    },
    {
      id: 'cmd-branch',
      label: 'New worktree',
      description: 'Create a new git worktree on a branch',
      group: 'Workspaces',
      icon: <GitBranch size={11} />,
      requiresInput: true,
      inputPlaceholder: 'Branch name',
    },
    {
      id: 'cmd-terminal',
      label: 'Open workspace terminal',
      description: 'Open a terminal in the active workspace',
      group: 'Workspaces',
      icon: <TerminalSquare size={11} />,
    },
    // Runtime
    {
      id: 'cmd-restart-daemon',
      label: 'Restart daemon',
      description: 'Restart the local runtime daemon',
      group: 'Runtime',
      icon: <RefreshCw size={11} />,
      action: () => runtime.restartDaemon(),
    },
    {
      id: 'cmd-escalation',
      label: 'Simulate escalation',
      description: 'Trigger a permission escalation request',
      group: 'Runtime',
      icon: <Shield size={11} />,
      action: () => runtime.simulateEscalation(),
    },
    {
      id: 'cmd-runtime-panel',
      label: 'Show runtime status',
      description: 'Open the runtime connection panel',
      group: 'Runtime',
      icon: <Cpu size={11} />,
      action: () => onViewChange?.('runtime'),
    },
    {
      id: 'cmd-provider-test',
      label: 'Ping all providers',
      description: 'Test reachability of all configured providers',
      group: 'Runtime',
      icon: <Globe size={11} />,
      action: () => runtime.pingAllProviders(),
    },
    {
      id: 'cmd-diagnostics',
      label: 'Run diagnostics',
      description: 'Full runtime diagnostics — daemon, providers, workspace health',
      group: 'Runtime',
      icon: <Activity size={11} />,
      action: () => runtime.runDiagnostics(),
    },
    {
      id: 'cmd-validate-repo',
      label: 'Validate repo path',
      description: 'Check if a local path is a valid git repository',
      group: 'Runtime',
      icon: <FolderSearch size={11} />,
      requiresInput: true,
      inputPlaceholder: '~/path/to/repo',
    },
    {
      id: 'cmd-daemon-logs',
      label: 'Show daemon logs',
      description: 'Open the runtime log stream',
      group: 'Runtime',
      icon: <ScrollText size={11} />,
      action: () => onViewChange?.('runtime'),
    },
    // Sessions
    {
      id: 'cmd-replay',
      label: 'Replay session',
      description: 'Replay a previous agent session',
      group: 'Sessions',
      icon: <Archive size={11} />,
    },
    {
      id: 'cmd-history',
      label: 'View session history',
      description: 'Browse all past sessions',
      group: 'Sessions',
      icon: <Clock size={11} />,
    },
  ]
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onViewChange?: (view: View) => void
  onSpawnSession?: () => void
}

export function CommandPalette({ open, onClose, onViewChange, onSpawnSession }: CommandPaletteProps) {
  const runtime = useRuntime()
  const commands = buildCommands(runtime, onViewChange, onSpawnSession)

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [inputMode, setInputMode] = useState<CommandDef | null>(null)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query
    ? commands.filter(
        c =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.description.toLowerCase().includes(query.toLowerCase()) ||
          c.group.toLowerCase().includes(query.toLowerCase()),
      )
    : commands

  // Show recents at top when no query
  const recentCommands = !query
    ? commands.filter(c => RECENT_COMMAND_IDS.includes(c.id))
    : []
  const regularFiltered = !query
    ? filtered.filter(c => !RECENT_COMMAND_IDS.includes(c.id))
    : filtered

  const displayGroups = !query
    ? ['Recent', ...new Set(regularFiltered.map(c => c.group))]
    : [...new Set(filtered.map(c => c.group))]

  const getGroupCommands = (group: string) => {
    if (group === 'Recent') return recentCommands
    return (query ? filtered : regularFiltered).filter(c => c.group === group)
  }

  const allDisplayed = !query
    ? [...recentCommands, ...regularFiltered]
    : filtered

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setInputMode(null)
      setInputValue('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const runCommand = useCallback(
    (cmd: CommandDef) => {
      if (cmd.requiresInput) {
        setInputMode(cmd)
        setQuery('')
        setInputValue('')
        setTimeout(() => inputRef.current?.focus(), 50)
        return
      }
      cmd.action?.()
      onClose()
    },
    [onClose],
  )

  const submitInput = useCallback(() => {
    if (!inputMode || !inputValue.trim()) return
    if (inputMode.id === 'cmd-inject') {
      runtime.triggerIntervention(inputValue.trim())
    } else if (inputMode.id === 'cmd-mount') {
      runtime.mountWorkspace('ws-custom', inputValue.trim())
    } else if (inputMode.id === 'cmd-create-worktree') {
      runtime.createWorktree('ws-001', inputValue.trim())
    }
    onClose()
  }, [inputMode, inputValue, runtime, onClose])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (inputMode) { setInputMode(null); return }
        onClose()
        return
      }
      if (inputMode) {
        if (e.key === 'Enter') { submitInput(); e.preventDefault() }
        return
      }
      if (e.key === 'ArrowDown') {
        setSelectedIndex(i => Math.min(i + 1, allDisplayed.length - 1))
        e.preventDefault()
      } else if (e.key === 'ArrowUp') {
        setSelectedIndex(i => Math.max(i - 1, 0))
        e.preventDefault()
      } else if (e.key === 'Enter') {
        const cmd = allDisplayed[selectedIndex]
        if (cmd) runCommand(cmd)
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, allDisplayed, selectedIndex, inputMode, runCommand, submitInput, onClose])

  useEffect(() => { setSelectedIndex(0) }, [query])

  let flatIndex = 0

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-[560px] glass-strong rounded-2xl border border-white/[0.08] shadow-[0_32px_64px_rgba(0,0,0,0.6)] overflow-hidden"
          >
            {/* Search / Input row */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.06]">
              {inputMode ? (
                <>
                  <ChevronRight size={13} className="text-cyan-500 flex-shrink-0" />
                  <span className="text-[11px] font-mono text-cyan-400 flex-shrink-0 whitespace-nowrap">
                    {inputMode.label}
                  </span>
                  <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    placeholder={inputMode.inputPlaceholder}
                    className="flex-1 bg-transparent text-[12px] font-mono text-slate-200 placeholder:text-slate-700 outline-none"
                  />
                  <kbd className="text-[9px] font-mono text-slate-700 bg-white/[0.05] px-1.5 py-0.5 rounded">
                    ↵ send
                  </kbd>
                </>
              ) : (
                <>
                  <Search size={13} className="text-slate-600 flex-shrink-0" />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search commands, workspaces, sessions…"
                    className="flex-1 bg-transparent text-[12px] font-mono text-slate-200 placeholder:text-slate-700 outline-none"
                  />
                  <kbd className="text-[9px] font-mono text-slate-700 bg-white/[0.05] px-1.5 py-0.5 rounded">
                    esc
                  </kbd>
                </>
              )}
            </div>

            {/* Command list */}
            {!inputMode && (
              <div className="max-h-80 overflow-y-auto py-1.5 scrollbar-thin">
                {allDisplayed.length === 0 ? (
                  <div className="px-4 py-6 text-center text-[11px] font-mono text-slate-700">
                    No commands match
                  </div>
                ) : (
                  displayGroups.map(group => {
                    const groupCmds = getGroupCommands(group)
                    if (groupCmds.length === 0) return null
                    return (
                      <div key={group}>
                        <div className="px-4 py-1.5 text-[9px] font-mono text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                          {group === 'Recent' && <Clock size={8} />}
                          {group}
                        </div>
                        {groupCmds.map(cmd => {
                          const isSelected = flatIndex === selectedIndex
                          const currentFlat = flatIndex++
                          return (
                            <button
                              key={cmd.id}
                              onClick={() => runCommand(cmd)}
                              onMouseEnter={() => setSelectedIndex(currentFlat)}
                              className={cn(
                                'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors',
                                isSelected ? 'bg-white/[0.05]' : 'hover:bg-white/[0.03]',
                              )}
                            >
                              <span className={cn(
                                'flex-shrink-0',
                                isSelected ? 'text-cyan-400' : 'text-slate-600',
                              )}>
                                {cmd.icon}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className={cn(
                                  'text-[11px] font-mono',
                                  isSelected ? 'text-slate-100' : 'text-slate-400',
                                )}>
                                  {cmd.label}
                                </div>
                                <div className="text-[10px] text-slate-700 truncate">
                                  {cmd.description}
                                </div>
                              </div>
                              {cmd.shortcut && (
                                <kbd className="flex-shrink-0 text-[9px] font-mono text-slate-700 bg-white/[0.05] px-1.5 py-0.5 rounded">
                                  {cmd.shortcut}
                                </kbd>
                              )}
                              {cmd.requiresInput && (
                                <ChevronRight size={10} className="flex-shrink-0 text-slate-700" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* Footer */}
            <div className="px-4 py-2 border-t border-white/[0.04] flex items-center gap-3 text-[9px] font-mono text-slate-800">
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>esc close</span>
              <span className="ml-auto">⌘K to open</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
