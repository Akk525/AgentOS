import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, GitBranch, TestTube, FileCode, AlertTriangle, Play, Coins, ChevronRight } from 'lucide-react'
import { StatusPill } from '../shared/StatusPill'
import { RuntimeBadge } from '../shared/RuntimeBadge'
import { AgentAvatar } from '../shared/AgentAvatar'
import { GlowButton } from '../shared/GlowButton'
import { Timeline } from './Timeline'
import { TerminalPanel } from './TerminalPanel'
import { ToolCallList } from './ToolCallList'
import { ReviewPanel } from '../review/ReviewPanel'
import { RawDiffPanel } from '../review/RawDiffPanel'
import { SessionControls } from '../runtime/SessionControls'
import { TakeoverPanel } from '../runtime/TakeoverPanel'
import { InjectModal } from '../runtime/InjectModal'
import { PermissionsPanel } from './PermissionsPanel'
import { SessionArchivePanel } from './SessionArchivePanel'
import { useRuntime } from '../../context/RuntimeContext'
import { mockSession } from '../../data/mockTraces'
import { mockTasks } from '../../data/mockTasks'
import { mockAgents } from '../../data/mockAgents'
import type { Task } from '../../types'

interface AgentSessionProps {
  task: Task | null
  onBack: () => void
}

type Tab = 'terminal' | 'tools' | 'review' | 'diff'

export function AgentSession({ task: propTask, onBack }: AgentSessionProps) {
  const task = propTask ?? mockTasks.find(t => t.status === 'running') ?? mockTasks[0]
  const agent = mockAgents.find(a => a.id === task.assignedAgentId)
  const [activeTab, setActiveTab] = useState<Tab>(task.status === 'review' ? 'review' : 'terminal')
  const [injectOpen, setInjectOpen] = useState(false)
  const session = mockSession

  const {
    sessionMode, setSessionMode, setActiveTaskId, injectedEvents,
    triggerIntervention, runTerminalCommand,
    liveTerminalLines, patchVersion,
    updatedCompletionNote, reviewRefreshedAt,
    testRunState,
  } = useRuntime()
  const isRunning = task.status === 'running' && sessionMode === 'autonomous'

  useEffect(() => {
    setActiveTaskId(task.id)
    return () => setActiveTaskId(null)
  }, [task.id, setActiveTaskId])

  // All session commands delegate to the engine via context — no direct state mutation
  const handlePause = ()                        => setSessionMode('paused')
  const handleResume = ()                       => setSessionMode('autonomous')
  const handleTakeover = ()                     => { setSessionMode('human_controlled'); setActiveTab('terminal') }
  const handleReturnToAgent = ()                => setSessionMode('autonomous')
  const handleInjectSubmit = (instruction: string) => triggerIntervention(instruction)
  const handleCommandRun = (cmd: string)        => runTerminalCommand(cmd)

  const allTerminalLines = [...session.terminalOutput, ...liveTerminalLines]
  const terminalStartFrom = liveTerminalLines.length > 0 ? session.terminalOutput.length : 0

  const allEvents = [...session.events, ...injectedEvents].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'terminal', label: 'Output' },
    { id: 'tools', label: 'Tool Calls', count: session.toolCalls.length },
    { id: 'review', label: 'Review' },
    { id: 'diff', label: 'Diff' },
  ]

  const totalPassed = session.testResults.reduce((s, t) => s + t.passed, 0)
  const totalFailed = session.testResults.reduce((s, t) => s + t.failed, 0)

  return (
    <div className="flex flex-col h-full">
      {/* Session header */}
      <div className="flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.06] flex-shrink-0">
        <button
          onClick={onBack}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all flex-shrink-0"
        >
          <ArrowLeft size={14} />
        </button>

        {agent && <AgentAvatar role={agent.role} status={agent.status} size="sm" />}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-0.5">
            <h1 className="text-sm font-semibold text-slate-100 truncate leading-snug">{task.title}</h1>
            <StatusPill status={task.status} />
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-600 font-mono">
            <span>{agent?.name}</span>
            <ChevronRight size={9} className="text-slate-700" />
            <span className="flex items-center gap-1"><GitBranch size={9} />{task.branch}</span>
            <ChevronRight size={9} className="text-slate-700" />
            <span className="text-slate-700">{task.repo}</span>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-4 flex-shrink-0">
          {task.runtimeSeconds !== undefined && (
            <RuntimeBadge startSeconds={task.runtimeSeconds} running={isRunning} />
          )}
          {session.totalTokens && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600">
              <Coins size={11} className="text-amber-600/60" />
              <span>{(session.totalTokens / 1000).toFixed(1)}k</span>
              {session.totalCostUsd && (
                <span className="text-slate-700">${session.totalCostUsd.toFixed(3)}</span>
              )}
            </div>
          )}
          {session.testResults.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <TestTube size={11} className={totalFailed > 0 ? 'text-crimson-400' : 'text-emerald-400'} />
              <span className={totalFailed > 0 ? 'text-crimson-400' : 'text-emerald-400'}>{totalPassed}p</span>
              {totalFailed > 0 && <span className="text-crimson-400">{totalFailed}f</span>}
            </div>
          )}
          {task.filesChanged && task.filesChanged.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600">
              <FileCode size={11} />
              <span>{task.filesChanged.length} files</span>
              {task.linesAdded !== undefined && <span className="text-emerald-500/60">+{task.linesAdded}</span>}
              {task.linesRemoved !== undefined && <span className="text-crimson-500/60">-{task.linesRemoved}</span>}
            </div>
          )}
          {task.riskScore !== undefined && task.riskScore > 0.4 && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-amber-400">
              <AlertTriangle size={11} />
              <span>{Math.round(task.riskScore * 100)}% risk</span>
            </div>
          )}
          <GlowButton variant="ghost" size="sm" icon={<Play size={11} />}>Replay</GlowButton>
        </div>
      </div>

      {/* Session controls strip */}
      <SessionControls
        sessionMode={sessionMode}
        onPause={handlePause}
        onResume={handleResume}
        onInject={() => setInjectOpen(true)}
        onTakeover={handleTakeover}
        onReturnToAgent={handleReturnToAgent}
        onRerunTests={() => {}}
        onReplay={() => {}}
        isRunning={isRunning}
      />

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Timeline */}
        <div className="w-56 flex-shrink-0 border-r border-white/[0.05] overflow-y-auto scrollbar-thin p-4">
          <div className="text-[9px] text-slate-700 font-mono uppercase tracking-widest mb-3">Timeline</div>
          <Timeline events={allEvents} isLive={isRunning} />
        </div>

        {/* Centre panel */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Tab bar */}
          <div className="flex items-center gap-0.5 px-3 py-2 border-b border-white/[0.05] flex-shrink-0">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    isActive ? 'text-slate-200' : 'text-slate-600 hover:text-slate-400'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="tab-bg"
                      className="absolute inset-0 rounded-lg bg-white/[0.07]"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`relative z-10 text-[10px] font-mono px-1 rounded ${isActive ? 'text-slate-400' : 'text-slate-700'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeTab}-${sessionMode}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0"
              >
                {activeTab === 'terminal' && (
                  sessionMode === 'human_controlled'
                    ? <TakeoverPanel
                        prevOutput={session.terminalOutput}
                        onReturnToAgent={handleReturnToAgent}
                        onCommandRun={handleCommandRun}
                      />
                    : <TerminalPanel
                        lines={allTerminalLines}
                        taskId={task.id}
                        isLive={isRunning}
                        startFrom={terminalStartFrom}
                      />
                )}
                {activeTab === 'tools' && <ToolCallList toolCalls={session.toolCalls} />}
                {activeTab === 'review' && (
                  <ReviewPanel
                    task={task}
                    session={session}
                    patchVersion={patchVersion}
                    updatedNote={updatedCompletionNote}
                    reviewRefreshedAt={reviewRefreshedAt}
                    testRunState={testRunState}
                  />
                )}
                {activeTab === 'diff' && <RawDiffPanel />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Right: files + tests */}
        <div className="w-52 flex-shrink-0 border-l border-white/[0.05] flex flex-col overflow-y-auto scrollbar-thin">
          <div className="p-4 border-b border-white/[0.05]">
            <div className="text-[9px] text-slate-700 font-mono uppercase tracking-widest mb-3">Files Touched</div>
            <div className="space-y-1">
              {(task.filesChanged ?? []).map(f => (
                <motion.div
                  key={f}
                  whileHover={{ x: 2 }}
                  className="text-[11px] font-mono text-slate-500 hover:text-slate-300 cursor-pointer truncate transition-colors flex items-center gap-1"
                >
                  <span className="text-slate-700 flex-shrink-0">›</span>
                  <span className="truncate">{f.split('/').slice(-1)[0]}</span>
                </motion.div>
              ))}
              {(!task.filesChanged || task.filesChanged.length === 0) && (
                <div className="text-[11px] text-slate-700 font-mono">No files yet</div>
              )}
            </div>
            {task.linesAdded !== undefined && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.04]">
                <span className="text-[11px] font-mono text-emerald-500">+{task.linesAdded}</span>
                {task.linesRemoved !== undefined && (
                  <span className="text-[11px] font-mono text-crimson-500">-{task.linesRemoved}</span>
                )}
              </div>
            )}
          </div>

          <div className="p-4">
            <div className="text-[9px] text-slate-700 font-mono uppercase tracking-widest mb-3">Tests</div>
            {session.testResults.length === 0 ? (
              <div className="text-[11px] text-slate-700 font-mono">Not run yet</div>
            ) : (
              <div className="space-y-3">
                {session.testResults.map(tr => {
                  const total = tr.passed + tr.failed + tr.skipped
                  const pct = total > 0 ? (tr.passed / total) : 0
                  return (
                    <div key={tr.suite}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono text-slate-600 truncate flex-1">{tr.suite}</span>
                        <span className="text-[10px] font-mono text-emerald-500 flex-shrink-0 ml-1">{tr.passed}</span>
                      </div>
                      <div className="h-[3px] bg-white/[0.05] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-emerald-500/50 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct * 100}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  )
                })}
                <div className="pt-1 text-[10px] font-mono text-slate-600">
                  {totalPassed} passing · {(session.testResults.reduce((s, t) => s + t.durationMs, 0) / 1000).toFixed(1)}s
                </div>
              </div>
            )}
          </div>

          <PermissionsPanel />
          <SessionArchivePanel />
        </div>
      </div>

      {/* Inject modal */}
      <AnimatePresence>
        {injectOpen && (
          <InjectModal
            onClose={() => setInjectOpen(false)}
            onSubmit={handleInjectSubmit}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
