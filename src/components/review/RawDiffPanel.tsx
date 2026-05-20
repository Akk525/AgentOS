import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { GitCompare, RefreshCw, FileDiff, Plus, Minus } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useRuntime } from '../../context/RuntimeContext'
import { getEnvironment } from '../../runtime/desktop/desktopBridge'

export function RawDiffPanel() {
  const { gitDiff, getGitDiff, commandRunning } = useRuntime()
  const isDesktop = getEnvironment() === 'tauri'

  // Auto-load diff on mount
  useEffect(() => {
    getGitDiff()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const lines = (gitDiff ?? '').split('\n')
  const additions = lines.filter(l => l.startsWith('+') && !l.startsWith('+++')).length
  const deletions = lines.filter(l => l.startsWith('-') && !l.startsWith('---')).length
  const changedFiles = lines.filter(l => l.startsWith('+++ b/')).map(l => l.replace('+++ b/', ''))

  const isEmpty = !gitDiff || gitDiff.trim() === ''

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.05] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <GitCompare size={12} className="text-slate-600" />
          <span className="text-[12px] font-semibold text-slate-300">Live diff</span>
          {!isDesktop && (
            <span className="text-[9px] font-mono text-amber-600/70 bg-amber-500/8 border border-amber-500/15 px-1.5 py-0.5 rounded">
              simulated
            </span>
          )}
          {!isEmpty && (
            <div className="flex items-center gap-2 ml-2">
              <span className="text-[10px] font-mono text-emerald-500">+{additions}</span>
              <span className="text-[10px] font-mono text-crimson-400">−{deletions}</span>
            </div>
          )}
        </div>
        <button
          onClick={() => getGitDiff()}
          disabled={commandRunning}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-mono text-slate-600 hover:text-slate-300 border border-white/[0.06] hover:border-white/[0.12] transition-all disabled:opacity-40"
        >
          <RefreshCw size={8} className={commandRunning ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Changed files strip */}
      {changedFiles.length > 0 && (
        <div className="px-4 py-2 border-b border-white/[0.04] flex items-center gap-2 flex-shrink-0 overflow-x-auto scrollbar-thin">
          <FileDiff size={9} className="text-slate-700 flex-shrink-0" />
          {changedFiles.map(f => (
            <span key={f} className="text-[9px] font-mono text-slate-600 bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/[0.05] flex-shrink-0">
              {f}
            </span>
          ))}
        </div>
      )}

      {/* Diff content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin font-mono text-[11px] leading-[1.7]">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-700">
            <GitCompare size={24} strokeWidth={1} />
            <div className="text-center">
              <div className="text-[12px] font-mono text-slate-600 mb-1">No file changes yet</div>
              <div className="text-[10px] font-mono text-slate-700">Run a session or edit files to see the diff here.</div>
            </div>
          </div>
        ) : (
          <div>
            {lines.map((line, i) => {
              const isAdd    = line.startsWith('+') && !line.startsWith('+++')
              const isDel    = line.startsWith('-') && !line.startsWith('---')
              const isHunk   = line.startsWith('@@')
              const isHeader = line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++')

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.05, delay: i * 0.002 }}
                  className={cn(
                    'flex items-stretch px-4 py-0 min-h-[22px]',
                    isAdd    && 'bg-emerald-500/[0.06]',
                    isDel    && 'bg-crimson-500/[0.06]',
                    isHunk   && 'bg-violet-950/20',
                    isHeader && 'bg-white/[0.02]',
                  )}
                >
                  <span className={cn(
                    'w-4 flex-shrink-0 flex items-center justify-center text-[10px] select-none',
                    isAdd  && 'text-emerald-500/60',
                    isDel  && 'text-crimson-500/60',
                  )}>
                    {isAdd ? <Plus size={8} /> : isDel ? <Minus size={8} /> : null}
                  </span>
                  <span className={cn(
                    'flex-1 pl-2 whitespace-pre overflow-hidden text-ellipsis',
                    isAdd    ? 'text-emerald-300/80'
                    : isDel  ? 'text-crimson-300/80'
                    : isHunk ? 'text-violet-400/60'
                    : isHeader ? 'text-slate-600'
                    : 'text-slate-500',
                  )}>
                    {line || ' '}
                  </span>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
