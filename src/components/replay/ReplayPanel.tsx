import { motion } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, SkipBack, SkipForward, X, Coins, Cpu, GitBranch,
} from 'lucide-react'
import { useReplay } from '../../hooks/useReplay'
import { DiffViewer } from '../review/DiffViewer'
import { Timeline } from '../sessions/Timeline'
import { GlowButton } from '../shared/GlowButton'

export function ReplayPanel() {
  const {
    isReplayMode,
    loading,
    chain,
    snapshot,
    totalSteps,
    currentIndex,
    exitReplay,
    stepBack,
    stepForward,
    jumpToStart,
    jumpToEnd,
    seek,
  } = useReplay()

  if (!isReplayMode) return null

  const step = snapshot?.step
  const payload = step?.payload ?? {}
  const tokens = (payload.totalTokens as number) ?? payload.cumulativeTokens ?? snapshot?.cumulativeTokens
  const cost = (payload.costUsd as number) ?? snapshot?.cumulativeCostUsd

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="fixed inset-x-4 bottom-10 z-50 max-w-5xl mx-auto rounded-2xl border border-violet-500/20 bg-[#08080f]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06]">
        <div className="min-w-0">
          <div className="text-[10px] font-mono text-violet-400 uppercase tracking-widest">Replay mode</div>
          <div className="text-xs text-slate-300 truncate">
            {chain?.projectTitle}
            {chain?.epic ? ` → ${chain.epic.title}` : ''}
            {chain ? ` · ${chain.stepCount} steps` : ''}
          </div>
          {chain?.goalText && (
            <div className="text-[10px] text-slate-600 truncate max-w-xl">{chain.goalText}</div>
          )}
        </div>
        <button
          type="button"
          onClick={exitReplay}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]"
        >
          <X size={14} />
        </button>
      </div>

      {loading ? (
        <div className="px-4 py-8 text-center text-sm text-slate-500 font-mono">Loading provenance…</div>
      ) : totalSteps === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-slate-500 font-mono">No replay steps for this scope.</div>
      ) : (
        <>
          <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-3">
            <GlowButton variant="ghost" size="sm" onClick={jumpToStart} icon={<SkipBack size={12} />}>
              Start
            </GlowButton>
            <GlowButton variant="ghost" size="sm" onClick={stepBack} icon={<ChevronLeft size={12} />}>
              Back
            </GlowButton>
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <input
                type="range"
                min={0}
                max={Math.max(0, totalSteps - 1)}
                value={currentIndex}
                onChange={e => seek(Number(e.target.value))}
                className="flex-1 accent-violet-500"
              />
              <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                {currentIndex + 1} / {totalSteps}
              </span>
            </div>
            <GlowButton variant="ghost" size="sm" onClick={stepForward} icon={<ChevronRight size={12} />}>
              Next
            </GlowButton>
            <GlowButton variant="ghost" size="sm" onClick={jumpToEnd} icon={<SkipForward size={12} />}>
              End
            </GlowButton>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 max-h-[45vh] overflow-hidden">
            <div className="p-4 border-b lg:border-b-0 lg:border-r border-white/[0.04] overflow-y-auto scrollbar-thin">
              <div className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-2">Step detail</div>
              {step && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                    <GitBranch size={10} />
                    <span>{step.type}</span>
                    <span className="text-slate-700">·</span>
                    <span>{new Date(step.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{step.message}</p>
                  {snapshot?.nodeTitle && (
                    <p className="text-[11px] text-slate-500">Node: {snapshot.nodeTitle}</p>
                  )}
                  <div className="flex items-center gap-3 text-[10px] font-mono text-slate-600">
                    {tokens !== undefined && (
                      <span className="flex items-center gap-1">
                        <Cpu size={9} />
                        {Number(tokens).toLocaleString()} tokens
                      </span>
                    )}
                    {cost !== undefined && (
                      <span className="flex items-center gap-1">
                        <Coins size={9} />
                        ${Number(cost).toFixed(4)}
                      </span>
                    )}
                  </div>
                  {chain && chain.tasks.length > 0 && (
                    <div className="pt-2 border-t border-white/[0.04]">
                      <div className="text-[9px] font-mono text-slate-700 uppercase tracking-widest mb-1">Tasks</div>
                      <div className="flex flex-wrap gap-1">
                        {chain.tasks.map(t => (
                          <span
                            key={t.id}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.03] text-slate-500 border border-white/[0.05]"
                          >
                            {t.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {snapshot?.traceEvents && snapshot.traceEvents.length > 0 && (
                <div className="mt-4">
                  <div className="text-[9px] font-mono text-slate-700 uppercase tracking-widest mb-2">Session trace</div>
                  <Timeline events={snapshot.traceEvents} isLive={false} />
                </div>
              )}
            </div>

            <div className="p-4 overflow-y-auto scrollbar-thin">
              <div className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-2">Snapshot</div>
              {snapshot?.diff && snapshot.diff.length > 0 ? (
                <div className="space-y-2">
                  {snapshot.diff.slice(0, 1).map(file => (
                    <DiffViewer key={file.path} file={file} />
                  ))}
                  {snapshot.diff.length > 1 && (
                    <p className="text-[10px] font-mono text-slate-600">
                      +{snapshot.diff.length - 1} more files at this step
                    </p>
                  )}
                </div>
              ) : snapshot?.terminalTail && snapshot.terminalTail.length > 0 ? (
                <pre className="text-[10px] font-mono text-slate-500 whitespace-pre-wrap bg-black/30 rounded-lg p-3 border border-white/[0.04]">
                  {snapshot.terminalTail.join('\n')}
                </pre>
              ) : (
                <p className="text-[11px] text-slate-600 font-mono">No diff or terminal output at this step.</p>
              )}
            </div>
          </div>
        </>
      )}
    </motion.div>
  )
}
