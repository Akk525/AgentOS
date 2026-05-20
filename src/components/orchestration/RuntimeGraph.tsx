import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'
import { useOrchestrator } from '../../context/OrchestratorContext'
import type { ActiveSession, OrchestratedSessionStatus, SessionDependency } from '../../types'

// ── Constants ─────────────────────────────────────────────────────────────────

const W = 900  // canvas width
const H = 480  // canvas height

// Card dimensions
const CW = 158
const CH = 70

// Session node positions (top-left corner of card)
const SESSION_POS: Record<string, { x: number; y: number }> = {
  'sess-001': { x: 80,  y: 20  },  // debugger — left col, top
  'sess-002': { x: 80,  y: 165 },  // reviewer — left col, middle
  'sess-003': { x: 80,  y: 310 },  // test-writer — left col, bottom
  'sess-004': { x: 380, y: 85  },  // refactorer — right col, top
  'sess-005': { x: 380, y: 280 },  // architect — right col, bottom
}

// Provider node positions (center of circle)
const PROVIDER_POS: Record<string, { cx: number; cy: number }> = {
  anthropic: { cx: 740, cy: 145 },
  openai:    { cx: 740, cy: 340 },
}

// Provider bindings
const PROVIDER_BINDINGS: [string, string][] = [
  ['sess-001', 'anthropic'],
  ['sess-002', 'anthropic'],
  ['sess-004', 'anthropic'],
  ['sess-005', 'anthropic'],
  ['sess-003', 'openai'],
]

// Status styling
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
  general:       '○',
}

const PROVIDER_LOGOS: Record<string, string> = {
  anthropic: '◆',
  openai:    '⬡',
}

// ── Edge helpers ─────────────────────────────────────────────────────────────

function cardCenter(id: string): { x: number; y: number } {
  const p = SESSION_POS[id]
  if (!p) return { x: 0, y: 0 }
  return { x: p.x + CW / 2, y: p.y + CH / 2 }
}

function cardEdge(id: string, side: 'left' | 'right' | 'top' | 'bottom') {
  const p = SESSION_POS[id]
  if (!p) return { x: 0, y: 0 }
  const cx = p.x + CW / 2
  const cy = p.y + CH / 2
  return {
    x: side === 'left' ? p.x : side === 'right' ? p.x + CW : cx,
    y: side === 'top'  ? p.y : side === 'bottom' ? p.y + CH  : cy,
  }
}

// Smooth bezier S-curve between two points
function bezier(x1: number, y1: number, x2: number, y2: number, curvature = 0.4) {
  const dx = Math.abs(x2 - x1) * curvature
  return `M ${x1},${y1} C ${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function SessionNode({ session }: { session: ActiveSession }) {
  const pos = SESSION_POS[session.id]
  if (!pos) return null
  const cfg = STATUS_CONFIG[session.status]
  const isActive = session.status === 'running' || session.status === 'reviewing'
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
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className={cn('text-[11px] font-mono flex-shrink-0', cfg.text)}>{glyph}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-slate-300 truncate leading-tight">
            {session.taskTitle.length > 26 ? session.taskTitle.slice(0, 24) + '…' : session.taskTitle}
          </div>
          <div className="text-[9px] font-mono text-slate-700 truncate">{session.workspaceName}/{session.branch.split('/').slice(-1)[0]}</div>
        </div>
      </div>

      {/* Footer */}
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

function WorkspaceLabel({ label, x, y }: { label: string; x: number; y: number }) {
  return (
    <g>
      <rect x={x - 34} y={y - 9} width={68} height={18} rx={4}
        className="fill-white/[0.03] stroke-white/[0.07]" strokeWidth={0.5} />
      <text x={x} y={y + 5} textAnchor="middle" fontSize={8.5} className="fill-slate-600 font-mono tracking-wide">{label}</text>
    </g>
  )
}

function DependencyEdge({ dep, sessions }: { dep: SessionDependency; sessions: ActiveSession[] }) {
  const isBlocked = dep.type === 'blocked_by'
  const isReview  = dep.type === 'reviews'
  if (!isBlocked && !isReview) return null

  const fromSession = sessions.find(s => s.id === dep.fromId)
  if (!fromSession) return null

  // blocked_by: fromId is the blocked session, toId is the blocking session
  // reviews: fromId is reviewer session, toId is the patch session
  const isDone = fromSession.status === 'completed'

  const color  = isBlocked ? '#f59e0b' : '#a78bfa'
  const label  = isBlocked ? 'blocked by' : 'reviewing'

  // Calculate edge path
  let d = ''
  if (dep.fromId === 'sess-002' && dep.toId === 'sess-001') {
    // reviews: sess-002 → sess-001 (both left column, curve through left side)
    const from = cardEdge(dep.fromId, 'left')
    const to   = cardEdge(dep.toId,   'left')
    d = `M ${from.x},${from.y} C ${from.x - 50},${from.y} ${to.x - 50},${to.y} ${to.x},${to.y}`
  } else if (dep.fromId === 'sess-004' && dep.toId === 'sess-001') {
    // blocked_by: sess-004 (right col) → sess-001 (left col)
    const from = cardEdge(dep.fromId, 'left')
    const to   = cardEdge(dep.toId,   'right')
    d = `M ${from.x},${from.y} C ${from.x - 60},${from.y} ${to.x + 60},${to.y} ${to.x},${to.y}`
  } else {
    const fc = cardCenter(dep.fromId)
    const tc = cardCenter(dep.toId)
    d = bezier(fc.x, fc.y, tc.x, tc.y)
  }

  return (
    <g opacity={isDone ? 0.25 : 1}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.5}
        strokeDasharray={isBlocked ? '5 3' : '4 2'} opacity={0.6}
        strokeLinecap="round" />
      {/* Label tag */}
      {(() => {
        // Place label at midpoint of path
        if (dep.fromId === 'sess-002') {
          return <text x={25} y={108} fontSize={7.5} className="fill-violet-500 font-mono" opacity={0.8}>{label}</text>
        } else if (dep.fromId === 'sess-004') {
          return <text x={235} y={94} fontSize={7.5} className="fill-amber-500 font-mono" opacity={0.8}>{label}</text>
        }
        return null
      })()}
    </g>
  )
}

function ProviderEdge({ fromId, toId, sessions }: { fromId: string; toId: string; sessions: ActiveSession[] }) {
  const session = sessions.find(s => s.id === fromId)
  const provider = PROVIDER_POS[toId]
  if (!session || !provider) return null

  const from = cardEdge(fromId, 'right')
  const d = bezier(from.x, from.y, provider.cx - 26, provider.cy, 0.5)
  const isDimmed = session.status === 'blocked' || session.status === 'completed'

  return (
    <path d={d} fill="none" stroke="#334155" strokeWidth={0.8}
      opacity={isDimmed ? 0.25 : 0.5} strokeLinecap="round" />
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function RuntimeGraph() {
  const { activeSessions, dependencies, runtimeLoad } = useOrchestrator()

  // Only show sessions that have a defined position
  const visibleSessions = activeSessions.filter(s => SESSION_POS[s.id])

  const workspaceLabels = [
    { label: 'boilerbyte',  x: 35, y: 190 },
    { label: 'clauseguard', x: 342, y: 80 },
    { label: 'formula-os',  x: 342, y: 275 },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Load strip */}
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
          <span className={cn('tabular-nums', runtimeLoad.providerCapacity.anthropic?.used >= runtimeLoad.providerCapacity.anthropic?.max ? 'text-crimson-400' : runtimeLoad.providerCapacity.anthropic?.used >= runtimeLoad.providerCapacity.anthropic?.max * 0.8 ? 'text-amber-400' : 'text-slate-500')}>
            {runtimeLoad.providerCapacity.anthropic?.used}/{runtimeLoad.providerCapacity.anthropic?.max}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <span className="text-slate-700">tokens/s</span>
          <span className="text-slate-400 tabular-nums">{runtimeLoad.tokenThroughputPerSec.toLocaleString()}</span>
        </div>
        {runtimeLoad.queueDepth > 0 && (
          <div className="ml-auto flex items-center gap-1.5 text-[10px] font-mono text-amber-500/80 bg-amber-500/8 border border-amber-500/20 px-2 py-0.5 rounded-lg">
            <span>⚠</span>
            <span>{runtimeLoad.queueDepth} queued</span>
          </div>
        )}
      </div>

      {/* Graph canvas */}
      <div className="flex-1 overflow-auto">
        <div className="relative" style={{ width: W, height: H, minHeight: H }}>
          {/* SVG layer — edges */}
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width={W}
            height={H}
            className="absolute inset-0 pointer-events-none"
            style={{ overflow: 'visible' }}
          >
            {/* Provider edges */}
            {PROVIDER_BINDINGS.map(([fromId, toId]) => (
              <ProviderEdge key={`${fromId}-${toId}`} fromId={fromId} toId={toId} sessions={visibleSessions} />
            ))}

            {/* Dependency edges */}
            {dependencies.map(dep => (
              <DependencyEdge key={`${dep.fromId}-${dep.toId}`} dep={dep} sessions={visibleSessions} />
            ))}

            {/* Workspace labels */}
            {workspaceLabels.map(l => (
              <WorkspaceLabel key={l.label} label={l.label} x={l.x} y={l.y} />
            ))}

            {/* Provider nodes */}
            {Object.entries(PROVIDER_POS).map(([id, pos]) => (
              <ProviderNode key={id} id={id} cx={pos.cx} cy={pos.cy} />
            ))}
          </svg>

          {/* Session cards — DOM layer */}
          <AnimatePresence>
            {visibleSessions.map(session => (
              <SessionNode key={session.id} session={session} />
            ))}
          </AnimatePresence>

          {/* Legend */}
          <div className="absolute bottom-4 left-5 flex items-center gap-4 text-[8px] font-mono text-slate-800">
            <div className="flex items-center gap-1">
              <div className="w-4 h-px bg-violet-500/50" style={{ borderTop: '1px dashed' }} />
              <span>reviews</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-px bg-amber-500/50" style={{ borderTop: '1px dashed' }} />
              <span>blocked_by</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-px bg-slate-600/50" />
              <span>provider</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
