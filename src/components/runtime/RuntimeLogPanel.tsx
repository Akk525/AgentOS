import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollText, Filter, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useRuntime } from '../../context/RuntimeContext'
import type { LogLevel, LogSource } from '../../types'

const levelColor: Record<LogLevel, string> = {
  debug: 'text-slate-700',
  info:  'text-slate-400',
  warn:  'text-amber-400',
  error: 'text-crimson-400',
}

const levelBadge: Record<LogLevel, string> = {
  debug: 'text-slate-700 bg-white/[0.03]',
  info:  'text-slate-600 bg-white/[0.03]',
  warn:  'text-amber-600 bg-amber-500/10',
  error: 'text-crimson-500 bg-crimson-500/10',
}

const sourceColor: Record<LogSource, string> = {
  daemon:    'text-violet-500',
  provider:  'text-cyan-500',
  workspace: 'text-emerald-500',
  bridge:    'text-blue-500',
  runtime:   'text-slate-500',
  agent:     'text-amber-500',
  terminal:  'text-slate-600',
}

const ALL_SOURCES: LogSource[] = ['daemon', 'provider', 'workspace', 'bridge', 'runtime', 'agent', 'terminal']
const ALL_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error']

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function RuntimeLogPanel() {
  const { runtimeLogs } = useRuntime()
  const [sourceFilter, setSourceFilter] = useState<Set<LogSource>>(new Set())
  const [levelFilter, setLevelFilter] = useState<Set<LogLevel>>(new Set())
  const [autoScroll, setAutoScroll] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [runtimeLogs.length, autoScroll])

  const filtered = runtimeLogs.filter(log => {
    if (sourceFilter.size > 0 && !sourceFilter.has(log.source)) return false
    if (levelFilter.size > 0 && !levelFilter.has(log.level)) return false
    return true
  })

  const toggleSource = (s: LogSource) => {
    setSourceFilter(prev => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  const toggleLevel = (l: LogLevel) => {
    setLevelFilter(prev => {
      const next = new Set(prev)
      next.has(l) ? next.delete(l) : next.add(l)
      return next
    })
  }

  const hasFilters = sourceFilter.size > 0 || levelFilter.size > 0

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.04] flex-shrink-0">
        <ScrollText size={11} className="text-slate-600" />
        <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest flex-1">
          Runtime logs
        </span>
        <span className="text-[9px] font-mono text-slate-700">{filtered.length} entries</span>
        <button
          onClick={() => setShowFilters(f => !f)}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded text-[9px] font-mono border transition-all',
            showFilters || hasFilters
              ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
              : 'border-white/[0.06] text-slate-600 hover:text-slate-400',
          )}
        >
          <Filter size={9} />
          {hasFilters ? `${sourceFilter.size + levelFilter.size} active` : 'Filter'}
        </button>
        <button
          onClick={() => setAutoScroll(a => !a)}
          className={cn(
            'px-2 py-1 rounded text-[9px] font-mono border transition-all',
            autoScroll
              ? 'border-emerald-500/25 bg-emerald-500/8 text-emerald-500'
              : 'border-white/[0.06] text-slate-600',
          )}
        >
          {autoScroll ? 'Live' : 'Paused'}
        </button>
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden flex-shrink-0"
          >
            <div className="px-4 py-2.5 border-b border-white/[0.04] flex gap-4">
              <div>
                <div className="text-[9px] font-mono text-slate-700 uppercase mb-1.5">Source</div>
                <div className="flex flex-wrap gap-1">
                  {ALL_SOURCES.map(s => (
                    <button
                      key={s}
                      onClick={() => toggleSource(s)}
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[9px] font-mono border transition-all',
                        sourceFilter.has(s)
                          ? `border-current ${sourceColor[s]} bg-current/10`
                          : 'border-white/[0.06] text-slate-700',
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-mono text-slate-700 uppercase mb-1.5">Level</div>
                <div className="flex gap-1">
                  {ALL_LEVELS.map(l => (
                    <button
                      key={l}
                      onClick={() => toggleLevel(l)}
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[9px] font-mono border transition-all',
                        levelFilter.has(l)
                          ? levelBadge[l] + ' border-current/30'
                          : 'border-white/[0.06] text-slate-700',
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {hasFilters && (
                <button
                  onClick={() => { setSourceFilter(new Set()); setLevelFilter(new Set()) }}
                  className="flex items-center gap-1 text-[9px] font-mono text-slate-600 hover:text-slate-400 self-end mb-0.5"
                >
                  <X size={8} /> Clear
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Log entries */}
      <div
        className="flex-1 overflow-y-auto scrollbar-thin font-mono text-[10px] leading-5"
        onScroll={e => {
          const el = e.currentTarget
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24
          setAutoScroll(atBottom)
        }}
      >
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-700">
            {runtimeLogs.length === 0 ? 'Waiting for runtime events…' : 'No entries match filters'}
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((log, i) => (
              <motion.div
                key={log.id}
                initial={i === filtered.length - 1 ? { opacity: 0, x: -4 } : false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.1 }}
                className="flex items-start gap-2 px-4 py-0.5 hover:bg-white/[0.02] group"
              >
                <span className="text-slate-800 flex-shrink-0 tabular-nums">
                  {formatTime(log.timestamp)}
                </span>
                <span className={cn('flex-shrink-0 w-10 text-right', levelColor[log.level])}>
                  {log.level}
                </span>
                <span className={cn('flex-shrink-0 w-16', sourceColor[log.source])}>
                  [{log.source}]
                </span>
                <span className={cn('flex-1 break-words', levelColor[log.level])}>
                  {log.message}
                </span>
              </motion.div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  )
}
