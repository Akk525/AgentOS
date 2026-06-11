import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'
import { useOrchestrator } from '../../context/OrchestratorContext'
import {
  layoutSessionPositions,
  providerBindingsForSessions,
} from '../../runtime/orchestrationProjection'
import type { ActiveSession, OrchestratedSessionStatus, SessionDependency } from '../../types'

const W = 900
const H = 480
const CW = 158
const CH = 70

const PROVIDER_POS: Record<string, { cx: number; cy: number }> = {
  anthropic: { cx: 740, cy: 145 },
  openai: { cx: 740, cy: 340 },
}

const STATUS_CONFIG: Record<OrchestratedSessionStatus, {
  border: string; dot: string; label: string; glow: string; text: string
}> = {
  running:         { border: 'border-cyan-500/25',   dot: 'bg-cyan-400',    label: 'running',   glow: 'shadow-[0_0_16px_rgba(34,211,238,0.12)]',   text: 'text-cyan-400'    },
  blocked:         { border: 'border-amber-500/30',  dot: 'bg-amber-400',   label: 'blocked',   glow: 'shadow-[0_0_16px_rgba(245,158,11,0.12)]',   text: 'text-amber-400'   },
  awaiting_review: { border: 'border-violet-500/30', dot: 'bg-violet-400',  label: 'review',    glow: 'shadow-[0_0_16px_rgba(167,139,250,0.12)]',  text: 'text-violet-400'  },
  reviewing:       { border: 'border-violet-500/40', dot: 'bg-violet-300',  label: 'reviewing', glow: 'shadow-[0_0_20px_rgba(167,139,250,0.18)]',  text: 'text-violet-300'  },
  queued:          { border: 'border-slate-500/20',  dot: 'bg-slate-600',   label: 'queued',    glow: '',                                           text: 'text-slate-500'   },
  initializing:    { border: 'border-emerald-500/20',dot: 'bg-emerald-400', label: 'starting',  glow: 'shadow-[0_0_12px_rgba(52,211,153,0.10)]',   text: 'text-emerald-400' },
  completed:       { border: 'border-emerald-500/20',dot: 'bg-emerald-500', label: 'done',      glow: '',                                           text: 'text-emerald-500' },
  failed:          { border: 'border-crimson-500/30',dot: 'bg-crimson-500', label: 'failed',    glow: 'shadow-[0_0_16px_rgba(239,68,68,0.12)]',    text: 'text-crimson-400' },
  planning:        { border: 'border-violet-500/40', dot: 'bg-violet-500',  label: 'planning',  glow: 'shadow-[0_0_20px_rgba(167,139,250,0.20)]',  text: 'text-violet-300'  },
}

const ROLE_GLYPHS: Record<string, string> = {
  debugger:      '⊘',
  reviewer:      '◈',
  'test-writer': '⊡',
  refactorer:    '⟳',
  architect:     '◆',
  planner:       '◇',
  builder:       '⚡',
  general:       '○',
}

const PROVIDER_LOGOS: Record<string, string> = {
  anthropic: '◆',
  openai:    '⬡',
}

function cardEdge(pos: { x: number; y: number }, side: 'left' | 'right' | 'top' | 'bottom') {
  const cx = pos.x + CW / 2
  const cy = pos.y + CH / 2
  return {
    x: side === 'left' ? pos.x : side === 'right' ? pos.x + CW : cx,
    y: side === 'top' ? pos.y : side === 'bottom' ? pos.y + CH : cy,
  }
}

function bezier(x1: number, y1: number, x2: number, y2: number, curvature = 0.4) {
  const dx = Math.abs(x2 - x1) * curvature
  return `M ${x1},${y1} C ${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`
}

function SessionNode({
  session,
  pos,
}: {
  session: ActiveSession
  pos: { x: number; y: number }
}) {
  const cfg = STATUS_CONFIG[session.status]
  const isActive = session.status === 'running' || session.status === 'reviewing' || session.status === 'planning'
  const glyph = ROLE_GLYPHS[session.agentRole] ?? '○'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{ position: 'absolute', left: pos.x, top: pos.y, width: CW, height: CH }}
      className={cn(
        'glass rounded-xl border flex flex-col justify-between px-3 py-2.5 cursor-default',
        cfg.border, cfg.glow,
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn('text-[11px] font-mono flex-shrink-0', cfg.text)}>{glyph}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-slate-300 truncate leading-tight">
            {session.taskTitle.length > 26 ? `${session.taskTitle.slice(0, 24)}…` : session.taskTitle}
          </div>
          <div className="text-[9px] font-mono text-slate-700 truncate">
            {session.workspaceName}/{session.branch.split('/').slice(-1)[0]}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-shrink-0">
            <div className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
            {isActive && (
              <motion.div
                className={cn('absolute inset-0 rounded-full', cfg.dot)}
                animate={{ scale: [1, 2.2, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
          </div>
          <span className={cn('text-[9px] font-mono', cfg.text)}>{cfg.label}</span>
        </div>
        <div className="flex items-center gap-2 text-[8px] font-mono text-slate-800">
          <span>v{session.patchVersion}</span>
          <span>{(session.tokensUsed / 1000).toFixed(1)}k</span>
        </div>
      </div>
    </motion.div>
  )
}

function ProviderNode({ id, cx, cy }: { id: string; cx: number; cy: number }) {
  const logo = PROVIDER_LOGOS[id] ?? '⚙'
  const label = id.charAt(0).toUpperCase() + id.slice(1)
  return (
    <g>
      <circle cx={cx} cy={cy} r={26} className="fill-white/[0.03] stroke-white/[0.08]" strokeWidth={1} />
      <text x={cx} y={cy + 4} textAnchor="middle" className="fill-slate-400 text-[14px]" fontSize={14}>{logo}</text>
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize={8} className="fill-slate-700 font-mono">{label}</text>
    </g>
  )
}

function DependencyEdge({
  dep,
  positions,
}: {
  dep: SessionDependency
  positions: Record<string, { x: number; y: number }>
}) {
  const fromPos = positions[dep.fromId]
  const toPos = positions[dep.toId]
  if (!fromPos || !toPos) return null

  const from = cardEdge(fromPos, 'right')
  const to = cardEdge(toPos, 'left')
  const d = bezier(from.x, from.y, to.x, to.y)
  const color = dep.type === 'blocked_by' ? '#f59e0b' : dep.type === 'reviews' ? '#a78bfa' : '#64748b'

  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeDasharray={dep.type === 'depends_on' ? '4 3' : '5 3'}
      opacity={0.6}
      strokeLinecap="round"
    />
  )
}

function ProviderEdge({
  fromId,
  toId,
  positions,
  sessions,
}: {
  fromId: string
  toId: string
  positions: Record<string, { x: number; y: number }>
  sessions: ActiveSession[]
}) {
  const session = sessions.find(s => s.id === fromId)
  const provider = PROVIDER_POS[toId]
  const fromPos = positions[fromId]
  if (!session || !provider || !fromPos) return null

  const from = cardEdge(fromPos, 'right')
  const d = bezier(from.x, from.y, provider.cx - 26, provider.cy, 0.5)
  const isDimmed = session.status === 'blocked' || session.status === 'completed' || session.status === 'queued'

  return (
    <path
      d={d}
      fill="none"
      stroke="#334155"
      strokeWidth={0.8}
      opacity={isDimmed ? 0.25 : 0.5}
      strokeLinecap="round"
    />
  )
}

export function RuntimeGraph() {
  const { activeSessions, dependencies, runtimeLoad } = useOrchestrator()

  const positions = useMemo(
    () => layoutSessionPositions(activeSessions),
    [activeSessions],
  )

  const providerBindings = useMemo(
    () => providerBindingsForSessions(activeSessions),
    [activeSessions],
  )

  const canvasHeight = Math.max(H, 20 + Math.ceil(activeSessions.length / 2) * 145 + CH)

  const workspaceLabels = useMemo(() => {
    const names = [...new Set(activeSessions.map(s => s.workspaceName))]
    return names.slice(0, 3).map((label, index) => ({
      label,
      x: index === 0 ? 35 : 342,
      y: 80 + index * 120,
    }))
  }, [activeSessions])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-5 px-5 py-2.5 border-b border-white/[0.04] flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <span className="text-slate-700">CPU</span>
          <div className="w-20 h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div
              className={cn('h-full rounded-full', runtimeLoad.cpuPercent > 80 ? 'bg-crimson-500' : runtimeLoad.cpuPercent > 60 ? 'bg-amber-400' : 'bg-emerald-500')}
              animate={{ width: `${runtimeLoad.cpuPercent}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
          <span className={cn('tabular-nums', runtimeLoad.cpuPercent > 80 ? 'text-crimson-400' : 'text-slate-500')}>
            {runtimeLoad.cpuPercent}%
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <span className="text-slate-700">sessions</span>
          <span className={cn('tabular-nums font-semibold', runtimeLoad.activeSessions >= runtimeLoad.maxConcurrentSessions ? 'text-amber-400' : 'text-slate-400')}>
            {runtimeLoad.activeSessions}/{runtimeLoad.maxConcurrentSessions}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <span className="text-slate-700">Anthropic</span>
          <span className="text-slate-500 tabular-nums">
            {runtimeLoad.providerCapacity.anthropic?.used}/{runtimeLoad.providerCapacity.anthropic?.max}
          </span>
        </div>
        {runtimeLoad.queueDepth > 0 && (
          <div className="ml-auto flex items-center gap-1.5 text-[10px] font-mono text-amber-500/80 bg-amber-500/8 border border-amber-500/20 px-2 py-0.5 rounded-lg">
            <span>{runtimeLoad.queueDepth} queued</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {activeSessions.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[11px] font-mono text-slate-700">
            No active sessions — create a project to begin
          </div>
        ) : (
          <div className="relative" style={{ width: W, height: canvasHeight, minHeight: canvasHeight }}>
            <svg
              viewBox={`0 0 ${W} ${canvasHeight}`}
              width={W}
              height={canvasHeight}
              className="absolute inset-0 pointer-events-none"
              style={{ overflow: 'visible' }}
            >
              {providerBindings.map(([fromId, toId]) => (
                <ProviderEdge
                  key={`${fromId}-${toId}`}
                  fromId={fromId}
                  toId={toId}
                  positions={positions}
                  sessions={activeSessions}
                />
              ))}

              {dependencies.map(dep => (
                <DependencyEdge key={`${dep.fromId}-${dep.toId}-${dep.type}`} dep={dep} positions={positions} />
              ))}

              {workspaceLabels.map(l => (
                <g key={l.label}>
                  <rect x={l.x - 34} y={l.y - 9} width={68} height={18} rx={4}
                    className="fill-white/[0.03] stroke-white/[0.07]" strokeWidth={0.5} />
                  <text x={l.x} y={l.y + 5} textAnchor="middle" fontSize={8.5} className="fill-slate-600 font-mono tracking-wide">
                    {l.label.length > 10 ? `${l.label.slice(0, 8)}…` : l.label}
                  </text>
                </g>
              ))}

              {Object.entries(PROVIDER_POS).map(([id, pos]) => (
                <ProviderNode key={id} id={id} cx={pos.cx} cy={pos.cy} />
              ))}
            </svg>

            <AnimatePresence>
              {activeSessions.map(session => {
                const pos = positions[session.id]
                if (!pos) return null
                return <SessionNode key={session.id} session={session} pos={pos} />
              })}
            </AnimatePresence>

            <div className="absolute bottom-4 left-5 flex items-center gap-4 text-[8px] font-mono text-slate-800">
              <div className="flex items-center gap-1">
                <div className="w-4 h-px bg-slate-600/50" />
                <span>depends_on</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-px bg-slate-600/50" />
                <span>provider</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
