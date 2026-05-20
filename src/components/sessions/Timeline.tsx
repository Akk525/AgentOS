import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Search, TestTube, Edit, Terminal, FilePlus,
  Send, RefreshCw, Sparkles, Wrench, ChevronDown, Coins,
  MessageSquarePlus, UserCheck, ArrowLeft, Bot, Zap,
} from 'lucide-react'
import { formatTime } from '../../lib/utils'
import { cn } from '../../lib/utils'
import type { TraceEvent, TraceEventType } from '../../types'

const eventConfig: Record<TraceEventType, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  read_file:          { icon: <FileText size={10} />,          color: 'text-slate-300',   bg: 'bg-slate-800/60',    border: 'border-slate-700/50' },
  search_code:        { icon: <Search size={10} />,            color: 'text-violet-300',  bg: 'bg-violet-900/40',   border: 'border-violet-700/30' },
  run_tests:          { icon: <TestTube size={10} />,          color: 'text-emerald-300', bg: 'bg-emerald-900/40',  border: 'border-emerald-700/30' },
  edit_file:          { icon: <Edit size={10} />,              color: 'text-cyan-300',    bg: 'bg-cyan-900/40',     border: 'border-cyan-700/30' },
  run_command:        { icon: <Terminal size={10} />,          color: 'text-amber-300',   bg: 'bg-amber-900/30',    border: 'border-amber-700/30' },
  create_file:        { icon: <FilePlus size={10} />,          color: 'text-violet-300',  bg: 'bg-violet-900/40',   border: 'border-violet-700/30' },
  delete_file:        { icon: <FilePlus size={10} />,          color: 'text-crimson-300', bg: 'bg-crimson-900/40',  border: 'border-crimson-700/30' },
  submit_review:      { icon: <Send size={10} />,              color: 'text-amber-300',   bg: 'bg-amber-900/30',    border: 'border-amber-700/30' },
  fetch_context:      { icon: <RefreshCw size={10} />,         color: 'text-slate-400',   bg: 'bg-slate-800/40',    border: 'border-slate-700/30' },
  generate_summary:   { icon: <Sparkles size={10} />,          color: 'text-amber-300',   bg: 'bg-amber-900/30',    border: 'border-amber-700/30' },
  tool_call:          { icon: <Wrench size={10} />,            color: 'text-slate-400',   bg: 'bg-slate-800/40',    border: 'border-slate-700/30' },
  human_instruction:  { icon: <MessageSquarePlus size={10} />, color: 'text-amber-300',   bg: 'bg-amber-900/40',    border: 'border-amber-600/40' },
  human_takeover:     { icon: <UserCheck size={10} />,         color: 'text-amber-200',   bg: 'bg-amber-800/50',    border: 'border-amber-500/50' },
  human_return:       { icon: <ArrowLeft size={10} />,         color: 'text-cyan-300',    bg: 'bg-cyan-900/30',     border: 'border-cyan-700/30' },
  agent_acknowledged: { icon: <Bot size={10} />,               color: 'text-slate-300',   bg: 'bg-slate-800/60',    border: 'border-slate-700/50' },
  agent_replanned:    { icon: <Bot size={10} />,               color: 'text-cyan-300',    bg: 'bg-cyan-900/30',     border: 'border-cyan-700/30' },
  patch_updated:      { icon: <Sparkles size={10} />,          color: 'text-violet-300',  bg: 'bg-violet-900/40',   border: 'border-violet-700/30' },
  review_refreshed:   { icon: <RefreshCw size={10} />,         color: 'text-emerald-300', bg: 'bg-emerald-900/40',  border: 'border-emerald-700/30' },
  system_event:       { icon: <Zap size={10} />,               color: 'text-slate-500',   bg: 'bg-slate-900/60',    border: 'border-slate-800/60' },
}

interface TimelineProps {
  events: TraceEvent[]
  isLive?: boolean
}

export function Timeline({ events, isLive = true }: TimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="relative space-y-0.5">
      {/* Vertical connector */}
      <div className="absolute left-[11px] top-3 bottom-8 w-px bg-gradient-to-b from-white/10 via-white/[0.06] to-transparent" />

      {events.map((event, i) => {
        const config = eventConfig[event.type]
        const isLast = i === events.length - 1
        const isExpanded = expandedId === event.id
        const hasDetail = !!(event.detail || event.tokenCount || event.durationMs)

        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
          >
            <button
              onClick={() => hasDetail && setExpandedId(isExpanded ? null : event.id)}
              className={cn(
                'w-full flex items-start gap-2.5 py-1.5 px-1 rounded-lg text-left transition-colors group',
                hasDetail && 'cursor-pointer hover:bg-white/[0.03]',
                !hasDetail && 'cursor-default',
                event.actor === 'human' && 'bg-amber-500/[0.03] hover:bg-amber-500/[0.06]',
              )}
            >
              {/* Icon node */}
              <div className={cn(
                'relative z-10 w-5.5 h-5.5 w-[22px] h-[22px] rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 border transition-all',
                config.bg,
                config.color,
                config.border,
                isLast && 'ring-1 ring-cyan-500/40',
              )}>
                {isLast && isLive && (
                  <motion.div
                    className="absolute inset-0 rounded-md bg-cyan-500/15"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
                <span className="relative z-10">{config.icon}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className={cn('text-[11px] leading-snug font-medium', isLast ? 'text-slate-200' : 'text-slate-400')}>
                    {event.label}
                  </span>
                  {hasDetail && (
                    <ChevronDown
                      size={10}
                      className={cn('flex-shrink-0 text-slate-700 group-hover:text-slate-500 transition-all', isExpanded && 'rotate-180')}
                    />
                  )}
                </div>

                {/* Inline meta */}
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] font-mono text-slate-700">{formatTime(event.timestamp)}</span>
                  {event.durationMs !== undefined && (
                    <span className="text-[9px] font-mono text-slate-700">{event.durationMs < 1000 ? `${event.durationMs}ms` : `${(event.durationMs / 1000).toFixed(1)}s`}</span>
                  )}
                  {event.actor === 'human' && (
                    <span className="text-[9px] font-mono text-amber-600/80 bg-amber-500/10 px-1 rounded">you</span>
                  )}
                  {event.actor === 'system' && (
                    <span className="text-[9px] font-mono text-slate-600 bg-slate-500/10 px-1 rounded">sys</span>
                  )}
                  {event.success === false && (
                    <span className="text-[9px] font-mono text-crimson-500 bg-crimson-500/10 px-1 rounded">failed</span>
                  )}
                </div>
              </div>
            </button>

            {/* Expanded detail */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="ml-[30px] mb-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05] space-y-2">
                    {event.detail && (
                      <p className="text-[10px] text-slate-500 leading-relaxed">{event.detail}</p>
                    )}
                    {(event.tokenCount || event.retryCount) && (
                      <div className="flex items-center gap-3">
                        {event.tokenCount && (
                          <div className="flex items-center gap-1 text-[9px] font-mono text-slate-600">
                            <Coins size={9} className="text-amber-600" />
                            <span>{event.tokenCount.toLocaleString()} tokens</span>
                          </div>
                        )}
                        {event.retryCount !== undefined && event.retryCount > 0 && (
                          <div className="flex items-center gap-1 text-[9px] font-mono text-amber-600">
                            <RefreshCw size={9} />
                            <span>{event.retryCount} retry</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}

      {/* Live indicator */}
      {isLive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: events.length * 0.05 + 0.1 }}
          className="flex items-center gap-2.5 py-1.5 px-1"
        >
          <div className="w-[22px] h-[22px] rounded-md flex items-center justify-center flex-shrink-0 bg-white/[0.03] border border-white/[0.05]">
            <div className="flex gap-0.5 items-end h-3">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-0.5 rounded-full bg-slate-600"
                  animate={{ height: ['4px', '10px', '4px'] }}
                  transition={{ duration: 1, delay: i * 0.15, repeat: Infinity, ease: 'easeInOut' }}
                />
              ))}
            </div>
          </div>
          <span className="text-[10px] text-slate-700 font-mono">running...</span>
        </motion.div>
      )}
    </div>
  )
}
