import { motion } from 'framer-motion'
import { CheckCircle2, Radio, Timer, AlertTriangle, TrendingUp, ArrowRight, Coins } from 'lucide-react'
import { GlassPanel } from '../shared/GlassPanel'
import { StatusPill } from '../shared/StatusPill'
import { GlowButton } from '../shared/GlowButton'
import { AgentAvatar } from '../shared/AgentAvatar'
import { RuntimeBadge } from '../shared/RuntimeBadge'
import { mockTasks } from '../../data/mockTasks'
import { mockAgents } from '../../data/mockAgents'
import type { View } from '../../App'
import type { Task } from '../../types'

interface DashboardProps {
  onViewChange: (view: View) => void
  onTaskClick: (task: Task) => void
}

const metrics = [
  { label: 'Completed today',  value: '12', delta: '+4',    icon: <CheckCircle2 size={15} />, accent: 'text-emerald-400', glow: 'shadow-[inset_0_0_40px_rgba(52,211,153,0.04)]' },
  { label: 'Active sessions',  value: '1',  delta: '',      icon: <Radio size={15} />,        accent: 'text-cyan-400',    glow: 'shadow-[inset_0_0_40px_rgba(34,211,238,0.04)]' },
  { label: 'Avg runtime',      value: '11m', delta: '-2m',  icon: <Timer size={15} />,        accent: 'text-violet-400',  glow: '' },
  { label: 'Needs attention',  value: '2',  delta: '',      icon: <AlertTriangle size={15} />,accent: 'text-amber-400',   glow: '' },
]

const recentActivity = [
  { time: '10:15', type: 'running',  text: 'Debugger is working on auth race condition' },
  { time: '08:21', type: 'review',   text: 'Billing tests ready for review — 47 passing' },
  { time: '07:09', type: 'done',     text: 'PR review complete — 1 finding, no blockers' },
  { time: '06:55', type: 'failed',   text: 'Architecture task failed — context overflow' },
  { time: '06:30', type: 'changes',  text: 'DB refactor returned — 3 tests failing' },
]

const activityAccent: Record<string, string> = {
  running: 'text-cyan-400',
  review:  'text-amber-400',
  done:    'text-emerald-400',
  failed:  'text-crimson-400',
  changes: 'text-orange-400',
}

const activityDot: Record<string, string> = {
  running: 'bg-cyan-400 animate-pulse',
  review:  'bg-amber-400',
  done:    'bg-emerald-500',
  failed:  'bg-crimson-500',
  changes: 'bg-orange-400',
}

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
}
const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export function Dashboard({ onViewChange, onTaskClick }: DashboardProps) {
  const runningTasks = mockTasks.filter(t => t.status === 'running')
  const reviewTasks  = mockTasks.filter(t => t.status === 'review')
  const activeAgents = mockAgents.filter(a => a.status === 'running')

  return (
    <div className="h-full overflow-y-auto scrollbar-thin px-6 py-5 space-y-5">

      {/* Page header */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">Mission Control</h1>
          <p className="text-[12px] text-slate-600 mt-0.5 font-mono">Sat 17 May 2026 · 10:15 UTC</p>
        </div>
        <GlowButton variant="secondary" size="sm" onClick={() => onViewChange('tasks')}>
          Task Board <ArrowRight size={12} className="ml-1" />
        </GlowButton>
      </motion.div>

      {/* Metrics row */}
      <motion.div variants={stagger} initial="animate" animate="animate" className="grid grid-cols-4 gap-3">
        {metrics.map(m => (
          <motion.div key={m.label} variants={fadeUp}>
            <GlassPanel className={`p-4 ${m.glow}`}>
              <div className="flex items-start justify-between mb-4">
                <span className={m.accent}>{m.icon}</span>
                {m.delta && (
                  <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/[0.08] px-1.5 py-0.5 rounded-full">
                    {m.delta}
                  </span>
                )}
              </div>
              <div className="text-2xl font-semibold text-white font-mono tracking-tight">{m.value}</div>
              <div className="text-[11px] text-slate-600 mt-1">{m.label}</div>
            </GlassPanel>
          </motion.div>
        ))}
      </motion.div>

      {/* Main content row */}
      <div className="grid grid-cols-3 gap-4">

        {/* Active work — 2 cols */}
        <motion.div variants={fadeUp} initial="initial" animate="animate" className="col-span-2 space-y-3">

          {/* Running sessions */}
          <GlassPanel className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-200">Active Sessions</h2>
              <button onClick={() => onViewChange('sessions')} className="text-[11px] text-slate-600 hover:text-slate-400 font-mono transition-colors">
                view all →
              </button>
            </div>

            {runningTasks.length === 0 ? (
              <div className="flex items-center justify-center h-16 text-slate-700 text-xs font-mono">No active sessions</div>
            ) : (
              <div className="space-y-2">
                {runningTasks.map(task => {
                  const agent = mockAgents.find(a => a.id === task.assignedAgentId)
                  return (
                    <motion.div
                      key={task.id}
                      whileHover={{ x: 2 }}
                      onClick={() => onTaskClick(task)}
                      className="flex items-center gap-3 p-3.5 rounded-xl cursor-pointer bg-cyan-500/[0.03] border border-cyan-500/[0.08] hover:border-cyan-500/[0.15] transition-all"
                    >
                      {agent && <AgentAvatar role={agent.role} status={agent.status} size="sm" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-slate-200 truncate font-medium">{task.title}</div>
                        <div className="text-[10px] text-slate-600 font-mono mt-0.5">{task.repo} · {task.branch}</div>
                      </div>
                      <div className="text-right flex-shrink-0 space-y-1">
                        <RuntimeBadge startSeconds={task.runtimeSeconds ?? 0} running />
                        <StatusPill status="running" />
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </GlassPanel>

          {/* Review queue */}
          {reviewTasks.length > 0 && (
            <GlassPanel className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-200">Awaiting Review</h2>
                <span className="text-[10px] font-mono text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">{reviewTasks.length}</span>
              </div>
              <div className="space-y-2">
                {reviewTasks.map(task => (
                  <motion.div
                    key={task.id}
                    whileHover={{ x: 2 }}
                    onClick={() => onTaskClick(task)}
                    className="flex items-center gap-3 p-3.5 rounded-xl cursor-pointer bg-amber-500/[0.03] border border-amber-500/[0.08] hover:border-amber-500/[0.18] transition-all"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-slate-200 truncate font-medium">{task.title}</div>
                      <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                        {task.repo} · {task.testsPassed} tests · {task.linesAdded !== undefined && `+${task.linesAdded}`}
                      </div>
                    </div>
                    <GlowButton variant="secondary" size="sm" onClick={() => onTaskClick(task)}>
                      Review
                    </GlowButton>
                  </motion.div>
                ))}
              </div>
            </GlassPanel>
          )}
        </motion.div>

        {/* Right column */}
        <motion.div variants={fadeUp} initial="initial" animate="animate" className="space-y-3">

          {/* System health */}
          <GlassPanel className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-400">System</h2>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-500">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                operational
              </div>
            </div>
            <div className="space-y-2.5">
              {[
                { label: 'Orchestrator', value: 'active', color: 'text-emerald-500' },
                { label: 'Agents',       value: `${activeAgents.length} / ${mockAgents.length}`, color: 'text-cyan-400' },
                { label: 'Queue',        value: '2 tasks', color: 'text-slate-400' },
                { label: 'Providers',    value: '2 connected', color: 'text-slate-400' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-600">{s.label}</span>
                  <span className={`text-[11px] font-mono ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </GlassPanel>

          {/* Active agents */}
          <GlassPanel className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-400">Active Agents</h2>
              <button onClick={() => onViewChange('agents')} className="text-[10px] text-slate-600 hover:text-slate-400 font-mono transition-colors">view →</button>
            </div>
            {activeAgents.length === 0 ? (
              <div className="text-xs text-slate-700 font-mono py-2">All idle</div>
            ) : (
              <div className="space-y-2.5">
                {activeAgents.map(agent => (
                  <div key={agent.id} className="flex items-center gap-2.5">
                    <AgentAvatar role={agent.role} status={agent.status} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-slate-300 font-medium">{agent.name}</div>
                      <div className="text-[10px] text-slate-700 font-mono truncate">{agent.model.split('-').slice(-2).join('-')}</div>
                    </div>
                    <StatusPill status={agent.status} />
                  </div>
                ))}
              </div>
            )}
          </GlassPanel>

          {/* Activity feed */}
          <GlassPanel className="p-4">
            <h2 className="text-xs font-semibold text-slate-400 mb-3">Activity</h2>
            <div className="space-y-3">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 mt-1 flex flex-col items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${activityDot[a.type] ?? 'bg-slate-600'}`} />
                    {i < recentActivity.length - 1 && <div className="w-px h-3 bg-white/[0.05]" />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-[11px] leading-snug ${activityAccent[a.type] ?? 'text-slate-400'}`}>
                      {a.text}
                    </p>
                    <span className="text-[9px] text-slate-700 font-mono">{a.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>

          {/* Weekly stats */}
          <GlassPanel className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-400">This Week</h2>
              <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-500">
                <TrendingUp size={10} />
                +18%
              </div>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Tasks done',    value: '47',  bar: 0.85, color: 'bg-emerald-500/40' },
                { label: 'Tests written', value: '312', bar: 0.65, color: 'bg-violet-500/40' },
                { label: 'Lines changed', value: '4.2k',bar: 0.72, color: 'bg-cyan-500/40' },
              ].map(s => (
                <div key={s.label} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-600">{s.label}</span>
                    <span className="text-[11px] font-mono text-slate-400">{s.value}</span>
                  </div>
                  <div className="h-0.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${s.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${s.bar * 100}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center gap-1.5 text-[10px] font-mono text-slate-600">
              <Coins size={9} className="text-amber-700" />
              <span>$12.40 total cost</span>
            </div>
          </GlassPanel>
        </motion.div>
      </div>
    </div>
  )
}
