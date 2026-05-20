import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, Clock, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { formatTime } from '../../lib/utils'
import { cn } from '../../lib/utils'
import type { ToolCall } from '../../types'

const toolConfig: Record<string, { color: string; bg: string }> = {
  read_file:    { color: 'text-slate-400',  bg: 'bg-slate-500/10 border-slate-500/20' },
  search_code:  { color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
  run_tests:    { color: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/20' },
  edit_file:    { color: 'text-cyan-400',   bg: 'bg-cyan-500/10 border-cyan-500/20' },
  run_command:  { color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
  create_file:  { color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
}

interface ToolCallListProps {
  toolCalls: ToolCall[]
}

export function ToolCallList({ toolCalls }: ToolCallListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(toolCalls[0]?.id ?? null)

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-4 space-y-2">
      {toolCalls.map((call, i) => {
        const cfg = toolConfig[call.name] ?? { color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' }
        const isExpanded = expandedId === call.id

        return (
          <motion.div
            key={call.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-xl border border-white/[0.06] overflow-hidden bg-white/[0.015]"
          >
            {/* Header row — always visible */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : call.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
            >
              {/* Tool name badge */}
              <span className={cn('text-[10px] font-mono px-2 py-0.5 rounded border flex-shrink-0', cfg.bg, cfg.color)}>
                {call.name}
              </span>

              {/* Main detail */}
              <span className="flex-1 text-[11px] text-slate-500 font-mono truncate">
                {typeof call.input === 'object' && Object.values(call.input)[0]
                  ? String(Object.values(call.input)[0]).split('/').slice(-1)[0]
                  : JSON.stringify(call.input).slice(0, 60)}
              </span>

              {/* Right meta */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[9px] font-mono text-slate-700 flex items-center gap-1">
                  <Clock size={9} />
                  {call.durationMs < 1000 ? `${call.durationMs}ms` : `${(call.durationMs / 1000).toFixed(1)}s`}
                </span>
                {call.success
                  ? <CheckCircle2 size={12} className="text-emerald-500" />
                  : <XCircle size={12} className="text-crimson-500" />
                }
                <ChevronDown size={11} className={cn('text-slate-700 transition-transform', isExpanded && 'rotate-180')} />
              </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="border-t border-white/[0.05]"
              >
                <div className="p-4 space-y-3">
                  {/* Timestamp */}
                  <div className="text-[9px] text-slate-700 font-mono">{formatTime(call.timestamp)}</div>

                  {/* Input */}
                  <div>
                    <div className="text-[9px] text-slate-700 font-mono uppercase tracking-widest mb-1.5">Input</div>
                    <pre className="text-[11px] font-mono text-slate-500 whitespace-pre-wrap break-all leading-relaxed bg-white/[0.02] rounded-lg p-3">
                      {JSON.stringify(call.input, null, 2)}
                    </pre>
                  </div>

                  {/* Output */}
                  {call.output && (
                    <div>
                      <div className="text-[9px] text-slate-700 font-mono uppercase tracking-widest mb-1.5">Output</div>
                      <div className="text-[11px] font-mono text-emerald-500/70 bg-emerald-500/[0.04] rounded-lg p-3 leading-relaxed whitespace-pre-wrap">
                        {call.output}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
