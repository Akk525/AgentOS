import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, Cpu, Layers, AlertTriangle, CheckCircle2, ChevronRight, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useRuntime } from '../../context/RuntimeContext'
import { useGraphTasks } from '../../hooks/useGraphTasks'
import { getTaskAgentDisplay } from '../../lib/taskAgent'
import type { SessionMode } from '../../types'
import type { RuntimeConnectionStatus } from '../../runtime/runtimeTypes'

const sessionModeLabel: Record<SessionMode, { label: string; color: string; dot: string }> = {
  autonomous:      { label: 'Autonomous', color: 'text-cyan-400',    dot: 'bg-cyan-400' },
  paused:          { label: 'Paused',     color: 'text-amber-400',   dot: 'bg-amber-400' },
  human_controlled:{ label: 'Manual',     color: 'text-amber-300',   dot: 'bg-amber-300' },
  awaiting_input:  { label: 'Waiting',    color: 'text-violet-400',  dot: 'bg-violet-400' },
  initializing:    { label: 'Init',       color: 'text-slate-400',   dot: 'bg-slate-400' },
}

const runtimePhaseLabel: Record<string, string> = {
  autonomous_running: 'running',
  human_controlled:   'manual control',
  paused:             'paused',
  agent_replanning:   'replanning...',
  patch_updating:     'updating patch...',
  tests_rerunning:    'running tests...',
  ready_for_review:   'ready for review',
}

const runtimePhaseColor: Record<string, string> = {
  autonomous_running: 'text-slate-500',
  human_controlled:   'text-amber-400',
  paused:             'text-amber-500',
  agent_replanning:   'text-amber-400',
  patch_updating:     'text-violet-400',
  tests_rerunning:    'text-violet-400',
  ready_for_review:   'text-emerald-400',
}

const connectionConfig: Record<RuntimeConnectionStatus, { icon: React.ReactNode; label: string; color: string }> = {
  connecting:    { icon: <RefreshCw size={9} className="animate-spin" />, label: 'connecting', color: 'text-slate-600' },
  connected:     { icon: <Wifi size={9} />,    label: 'connected',    color: 'text-emerald-600/70' },
  syncing:       { icon: <RefreshCw size={9} className="animate-spin" />, label: 'syncing', color: 'text-amber-500/70' },
  disconnected:  { icon: <WifiOff size={9} />, label: 'disconnected', color: 'text-crimson-500' },
}

export function RuntimeStatusBar() {
  const { sessionMode, runtimePhase, activeTaskId, metrics, connectionStatus } = useRuntime()
  const [tokPerSec, setTokPerSec] = useState(metrics.tokensPerSec)
  const [tick, setTick] = useState(0)

  const { tasks } = useGraphTasks()
  const runningTasks = tasks.filter(t => t.status === 'running')
  const reviewTasks  = tasks.filter(t => t.status === 'review')
  const activeTask   = activeTaskId ? tasks.find(t => t.id === activeTaskId) : runningTasks[0]
  const activeAgent  = activeTask ? getTaskAgentDisplay(activeTask) : null

  // Simulate live token throughput jitter
  useEffect(() => {
    const id = setInterval(() => {
      setTokPerSec(v => Math.max(80, Math.min(200, v + Math.floor((Math.random() - 0.48) * 12))))
      setTick(t => t + 1)
    }, 1800)
    return () => clearInterval(id)
  }, [])

  const modeConfig = sessionModeLabel[sessionMode]

  return (
    <div className="relative h-[34px] flex-shrink-0 flex items-center px-4 select-none"
      style={{
        background: 'rgba(4,4,8,0.85)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Left: active session */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Session mode pill */}
        <div className="flex items-center gap-1.5">
          <motion.div
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${modeConfig.dot}`}
            animate={sessionMode === 'autonomous'
              ? { opacity: [1, 0.35, 1] }
              : sessionMode === 'human_controlled'
              ? { scale: [1, 1.2, 1] }
              : {}}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className={`text-[10px] font-mono ${modeConfig.color}`}>{modeConfig.label}</span>
        </div>

        <div className="w-px h-3.5 bg-white/[0.06]" />

        {/* Active task */}
        {activeTask ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <Activity size={10} className="text-slate-600 flex-shrink-0" />
            <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">{activeTask.id}</span>
            <ChevronRight size={9} className="text-slate-700 flex-shrink-0" />
            <span className="text-[10px] text-slate-400 truncate">{activeAgent?.name}</span>
            <ChevronRight size={9} className="text-slate-700 flex-shrink-0" />
            <span className="text-[10px] text-slate-500 truncate max-w-[200px]">{activeTask.title}</span>
          </div>
        ) : (
          <span className="text-[10px] text-slate-700 font-mono">no active session</span>
        )}
      </div>

      {/* Center: metrics */}
      <div className="flex items-center gap-4 mx-6">
        {/* Token throughput */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <Cpu size={9} className="text-slate-600" />
          <AnimatePresence mode="wait">
            <motion.span
              key={tick}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              className="text-slate-500 tabular-nums w-8 text-right"
            >
              {tokPerSec}
            </motion.span>
          </AnimatePresence>
          <span className="text-slate-700">tok/s</span>
        </div>

        {/* Context window */}
        <div className="flex items-center gap-1.5">
          <Layers size={9} className="text-slate-600" />
          <div className="w-20 h-1 bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-violet-500/40"
              style={{ width: `${metrics.contextWindowPct * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-600">{Math.round(metrics.contextWindowPct * 100)}%</span>
        </div>

        {/* Phase */}
        <div className="hidden xl:flex items-center gap-1 text-[10px] font-mono text-slate-700">
          <span>phase:</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={runtimePhase}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.2 }}
              className={runtimePhaseColor[runtimePhase] ?? 'text-slate-500'}
            >
              {runtimePhaseLabel[runtimePhase] ?? runtimePhase}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* Right: global status */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Running */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-600">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/60" />
          <span>{runningTasks.length} running</span>
        </div>

        {/* Review queue */}
        {reviewTasks.length > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-600">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>{reviewTasks.length} review</span>
          </div>
        )}

        <div className="w-px h-3.5 bg-white/[0.06]" />

        {/* Cost */}
        <span className="text-[10px] font-mono text-slate-600">$12.40 today</span>

        {/* Provider */}
        <span className="text-[10px] font-mono text-slate-700">anthropic</span>

        {/* Health */}
        <div className="flex items-center gap-1">
          {metrics.runtimeHealth === 'good'
            ? <CheckCircle2 size={10} className="text-emerald-500/70" />
            : <AlertTriangle size={10} className="text-amber-400" />
          }
          <span className={`text-[10px] font-mono ${metrics.runtimeHealth === 'good' ? 'text-emerald-600' : 'text-amber-500'}`}>
            {metrics.runtimeHealth}
          </span>
        </div>

        <div className="w-px h-3.5 bg-white/[0.06]" />

        {/* Runtime connection status */}
        <AnimatePresence mode="wait">
          <motion.div
            key={connectionStatus}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex items-center gap-1 text-[10px] font-mono ${connectionConfig[connectionStatus].color}`}
          >
            {connectionConfig[connectionStatus].icon}
            <span className="hidden 2xl:inline">{connectionConfig[connectionStatus].label}</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
