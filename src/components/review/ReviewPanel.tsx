import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle, XCircle, MessageSquare, AlertTriangle,
  FileCode, TestTube, Zap, ChevronDown, Coins, ThumbsUp,
  RefreshCw, GitMerge, Loader2,
} from 'lucide-react'
import { GlowButton } from '../shared/GlowButton'
import { StatusPill } from '../shared/StatusPill'
import { DiffViewer } from './DiffViewer'
import type { Task, SessionData, AgentCompletionNote, TestRunState } from '../../types'

interface ReviewPanelProps {
  task: Task
  session: SessionData
  patchVersion?: number
  updatedNote?: AgentCompletionNote | null
  reviewRefreshedAt?: string | null
  testRunState?: TestRunState
  onApprove?: () => void
  onReject?: () => void
  onRequestChanges?: (note: string) => void
}

type ApprovalState = 'idle' | 'approved' | 'rejected' | 'changes'

export function ReviewPanel({
  task, session,
  patchVersion = 1,
  updatedNote,
  reviewRefreshedAt,
  testRunState = 'idle',
  onApprove,
  onReject,
  onRequestChanges,
}: ReviewPanelProps) {
  const [selectedFile, setSelectedFile] = useState(session.diff[0]?.path ?? '')
  const [changesNote, setChangesNote] = useState('')
  const [showChangesInput, setShowChangesInput] = useState(false)
  const [approval, setApproval] = useState<ApprovalState>('idle')
  const [noteExpanded, setNoteExpanded] = useState(true)

  const selectedDiff = session.diff.find(d => d.path === selectedFile)
  const note = updatedNote ?? session.completionNote
  const totalPassed = updatedNote
    ? updatedNote.testsPassed
    : session.testResults.reduce((s, t) => s + t.passed, 0)

  if (approval !== 'idle') {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4 max-w-sm"
        >
          {approval === 'approved' && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <ThumbsUp size={28} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white mb-1">Approved — Merging</h3>
                <p className="text-sm text-slate-500">{task.branch} → main is being merged locally.</p>
              </div>
            </>
          )}
          {approval === 'rejected' && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-crimson-500/10 border border-crimson-500/20 flex items-center justify-center mx-auto">
                <XCircle size={28} className="text-crimson-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white mb-1">Task Rejected</h3>
                <p className="text-sm text-slate-500">Worktree removed. Task marked failed.</p>
              </div>
            </>
          )}
          {approval === 'changes' && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
                <MessageSquare size={28} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white mb-1">Changes Requested</h3>
                <p className="text-sm text-slate-500">The agent will re-open this task and address your feedback.</p>
              </div>
            </>
          )}
          <button
            onClick={() => setApproval('idle')}
            className="text-xs text-slate-600 hover:text-slate-400 font-mono transition-colors"
          >
            ← back to review
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Patch version + refresh banner */}
      <AnimatePresence>
        {(patchVersion > 1 || reviewRefreshedAt) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex items-center gap-3 px-4 py-2 border-b border-emerald-500/10 flex-shrink-0"
            style={{ background: 'rgba(16,185,129,0.04)' }}
          >
            <div className="flex items-center gap-1.5">
              <RefreshCw size={10} className="text-emerald-500/70" />
              <span className="text-[10px] font-mono text-emerald-400/80">Review refreshed after intervention</span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <GitMerge size={10} className="text-violet-400/70" />
              <span className="text-[10px] font-mono text-violet-300/80">Patch v{patchVersion}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Test run status */}
      <AnimatePresence>
        {testRunState === 'running' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-2 px-4 py-2 border-b border-amber-500/10 flex-shrink-0"
            style={{ background: 'rgba(251,191,36,0.03)' }}
          >
            <Loader2 size={10} className="text-amber-400/70 animate-spin" />
            <span className="text-[10px] font-mono text-amber-400/70">Tests rerunning after patch update...</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 overflow-hidden">
      {/* Left sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-white/[0.05] flex flex-col overflow-y-auto scrollbar-thin">

        {/* Agent completion note */}
        {note ? (
          <div className="border-b border-white/[0.05]">
            <button
              onClick={() => setNoteExpanded(!noteExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
            >
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Agent Summary</span>
              <ChevronDown size={12} className={`text-slate-600 transition-transform ${noteExpanded ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {noteExpanded && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-3">
                    {/* Summary */}
                    <p className="text-[11px] text-slate-400 leading-relaxed">{note.summary}</p>

                    {/* What changed */}
                    <div>
                      <div className="text-[9px] text-slate-700 font-mono uppercase tracking-widest mb-1.5">What Changed</div>
                      <ul className="space-y-1">
                        {note.whatChanged.map((c, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[10px] text-slate-500 leading-relaxed">
                            <span className="text-slate-700 mt-0.5 flex-shrink-0">›</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Why */}
                    <div>
                      <div className="text-[9px] text-slate-700 font-mono uppercase tracking-widest mb-1.5">Root Cause</div>
                      <p className="text-[10px] text-slate-500 leading-relaxed">{note.whyItChanged}</p>
                    </div>

                    {/* Confidence */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="text-[9px] text-slate-700 font-mono uppercase tracking-widest">Confidence</div>
                        <span className="text-[10px] font-mono text-amber-400">{Math.round(note.confidence * 100)}%</span>
                      </div>
                      <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${note.confidence * 100}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                          className="h-full rounded-full bg-gradient-to-r from-amber-600/60 to-amber-400/80"
                        />
                      </div>
                    </div>

                    {/* Cost */}
                    {note.costUsd && (
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-600 pt-1 border-t border-white/[0.04]">
                        <Coins size={10} className="text-amber-700" />
                        <span>{note.tokensUsed?.toLocaleString()} tokens · ${note.costUsd.toFixed(3)}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="p-4 border-b border-white/[0.05]">
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-2">Agent Summary</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">{task.completionNote ?? 'No summary provided.'}</p>
          </div>
        )}

        {/* Changed files */}
        <div className="p-4 border-b border-white/[0.05]">
          <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-2.5">Changed Files</div>
          <div className="space-y-0.5">
            {session.diff.map(d => (
              <button
                key={d.path}
                onClick={() => setSelectedFile(d.path)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all ${
                  selectedFile === d.path
                    ? 'bg-white/[0.07] text-slate-200'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileCode size={10} className="flex-shrink-0 text-slate-600" />
                  <span className="text-[11px] font-mono truncate">{d.path.split('/').slice(-1)[0]}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                  <span className="text-[9px] font-mono text-emerald-600">+{d.additions}</span>
                  <span className="text-[9px] font-mono text-crimson-700">-{d.deletions}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tests */}
        <div className="p-4 border-b border-white/[0.05]">
          <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-2.5">Test Results</div>
          <div className="space-y-2">
            {session.testResults.map(tr => (
              <div key={tr.suite} className="flex items-center gap-2">
                <TestTube size={10} className="text-emerald-500 flex-shrink-0" />
                <span className="text-[10px] font-mono text-slate-600 flex-1 truncate">{tr.suite}</span>
                <span className="text-[10px] font-mono text-emerald-500">{tr.passed}</span>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <StatusPill status={task.testStatus ?? 'pending'} size="md" />
          </div>
          <div className="mt-2 text-[10px] font-mono text-slate-600">
            {totalPassed} tests · {session.testResults.reduce((s, t) => s + t.durationMs, 0) / 1000}s
          </div>
        </div>

        {/* Risks */}
        {note?.unresolvedRisks && note.unresolvedRisks.length > 0 && (
          <div className="p-4">
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
              <AlertTriangle size={10} className="text-amber-500" />
              Unresolved Risks
            </div>
            <div className="space-y-2">
              {note.unresolvedRisks.map((risk, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-amber-500/[0.05] border border-amber-500/10">
                  <p className="text-[10px] text-amber-300/70 leading-relaxed">{risk}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Diff + actions */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {selectedDiff ? (
            <DiffViewer file={selectedDiff} />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-700 text-sm font-mono">
              select a file
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className="border-t border-white/[0.06] bg-black/20 flex-shrink-0">
          <AnimatePresence>
            {showChangesInput && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b border-white/[0.05]"
              >
                <div className="p-4">
                  <div className="text-[10px] text-slate-600 font-mono mb-2">Describe what the agent should change:</div>
                  <textarea
                    value={changesNote}
                    onChange={e => setChangesNote(e.target.value)}
                    placeholder="The mutex doesn't propagate errors to concurrent callers — the agent should handle the case where pendingRefresh rejects..."
                    rows={3}
                    autoFocus
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-700 outline-none focus:border-amber-500/30 transition-all resize-none font-mono leading-relaxed"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-600">
              <span>{session.diff.length} files</span>
              <span>·</span>
              <span className="text-emerald-600">+{task.linesAdded ?? 23}</span>
              <span className="text-crimson-700">-{task.linesRemoved ?? 11}</span>
              {note?.confidence && (
                <>
                  <span>·</span>
                  <div className="flex items-center gap-1">
                    <Zap size={10} className="text-amber-600" />
                    <span className="text-amber-600">{Math.round(note.confidence * 100)}% confidence</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <GlowButton
                variant="danger"
                size="sm"
                icon={<XCircle size={13} />}
                onClick={() => {
                  setApproval('rejected')
                  onReject?.()
                }}
              >
                Reject
              </GlowButton>
              <GlowButton
                variant="secondary"
                size="sm"
                icon={<MessageSquare size={13} />}
                onClick={() => {
                  if (showChangesInput && changesNote.trim()) {
                    setApproval('changes')
                    onRequestChanges?.(changesNote.trim())
                    setShowChangesInput(false)
                  } else {
                    setShowChangesInput(!showChangesInput)
                  }
                }}
              >
                {showChangesInput && changesNote ? 'Send Changes' : 'Request Changes'}
              </GlowButton>
              <GlowButton
                variant="primary"
                size="sm"
                icon={<CheckCircle size={13} />}
                onClick={() => {
                  setApproval('approved')
                  onApprove?.()
                }}
              >
                Approve & Merge
              </GlowButton>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
