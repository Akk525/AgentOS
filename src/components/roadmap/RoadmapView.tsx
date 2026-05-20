import { motion } from 'framer-motion'
import { CheckCircle2, Circle, Clock } from 'lucide-react'
import { cn } from '../../lib/utils'

type PhaseStatus = 'done' | 'current' | 'upcoming' | 'future'

interface RoadmapPhase {
  version: string
  title: string
  status: PhaseStatus
  description: string
  items: string[]
}

const PHASES: RoadmapPhase[] = [
  {
    version: 'v0.x',
    title: 'Foundation',
    status: 'done',
    description: 'Core runtime, session model, workspace system, agent lifecycle, command palette.',
    items: [
      'RuntimeEngine + RuntimeDaemon',
      'Event-driven state architecture',
      'Workspace + worktree simulation',
      'Session spawn wizard',
      'Permission escalation model',
    ],
  },
  {
    version: 'v1.0',
    title: 'Orchestration Layer',
    status: 'done',
    description: 'Multi-session coordination, dependency graphs, review lifecycle, runtime planning.',
    items: [
      'Multi-session orchestration',
      'OrchestratorProvider + runtime plans',
      'Delegation chains + planner sessions',
      'RuntimeReasoning — every decision explained',
      'Blocker + escalation system',
      'Human override controls',
    ],
  },
  {
    version: 'v1.1',
    title: 'OSS Readiness',
    status: 'current',
    description: 'Onboarding, demo workspace, documentation, contributor experience.',
    items: [
      'Cinematic first-run onboarding',
      'Keyboard shortcut discoverability',
      'README + architecture docs',
      'Contributor guide',
      'GitHub issue / PR templates',
      'Roadmap view',
    ],
  },
  {
    version: 'v2.0',
    title: 'Real PTY Execution',
    status: 'upcoming',
    description: 'Replace simulation with actual shell execution inside sandboxed terminals.',
    items: [
      'PTY bridge via Tauri IPC',
      'Real command output streaming',
      'Session stderr / exit code handling',
      'Sandboxed execution environments',
    ],
  },
  {
    version: 'v2.1',
    title: 'Tauri Desktop Runtime',
    status: 'upcoming',
    description: 'Ship as a native desktop application with full IPC and system integration.',
    items: [
      'Tauri v2 app shell',
      'Native file system access',
      'System tray daemon indicator',
      'OS-level notifications',
    ],
  },
  {
    version: 'v2.2',
    title: 'Real Git Worktrees',
    status: 'upcoming',
    description: 'Replace simulated branches with real isolated git worktrees per session.',
    items: [
      'git worktree create/delete lifecycle',
      'Real branch isolation per session',
      'Merge + conflict detection',
      'Worktree status in UI',
    ],
  },
  {
    version: 'v3.0',
    title: 'Remote Runner Support',
    status: 'future',
    description: 'Extend orchestration to cloud execution environments.',
    items: [
      'Remote agent runner protocol',
      'Distributed session management',
      'Cloud provider integrations',
      'Latency-aware scheduling',
    ],
  },
  {
    version: 'v3.1',
    title: 'MCP Integration',
    status: 'future',
    description: 'Model Context Protocol support for external tools and data sources.',
    items: [
      'MCP server registry',
      'Tool permission model',
      'Context injection pipeline',
      'Multi-server coordination',
    ],
  },
  {
    version: 'v3.2',
    title: 'Plugin Ecosystem',
    status: 'future',
    description: 'Extensible architecture for community-built agent capabilities.',
    items: [
      'Plugin API surface',
      'Sandboxed plugin runtime',
      'Community plugin registry',
      'Capability permission model',
    ],
  },
  {
    version: 'v4.0',
    title: 'Replay Engine',
    status: 'future',
    description: 'Record, replay, and debug any session with full event reconstruction.',
    items: [
      'Session event recording',
      'Step-through replay',
      'Diff viewer per step',
      'Branch-point exploration',
    ],
  },
  {
    version: 'v4.x',
    title: 'Runtime APIs',
    status: 'future',
    description: 'Programmatic access to the AgentOS runtime for external integrations.',
    items: [
      'HTTP + WebSocket runtime API',
      'Webhook event subscriptions',
      'SDK for external orchestrators',
      'CI/CD pipeline integration',
    ],
  },
]

const STATUS_CONFIG: Record<PhaseStatus, {
  badge: string; badgeText: string; dot: React.ReactNode; opacity: string
}> = {
  done: {
    badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    badgeText: 'Done',
    dot: <CheckCircle2 size={14} className="text-emerald-500" />,
    opacity: 'opacity-70',
  },
  current: {
    badge: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
    badgeText: 'Current',
    dot: <Circle size={14} className="text-violet-400 fill-violet-400" />,
    opacity: 'opacity-100',
  },
  upcoming: {
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    badgeText: 'Upcoming',
    dot: <Clock size={14} className="text-cyan-500" />,
    opacity: 'opacity-80',
  },
  future: {
    badge: 'bg-slate-500/8 text-slate-500 border-slate-500/15',
    badgeText: 'Future',
    dot: <Circle size={14} className="text-slate-700" />,
    opacity: 'opacity-50',
  },
}

function PhaseCard({ phase, index }: { phase: RoadmapPhase; index: number }) {
  const cfg = STATUS_CONFIG[phase.status]
  const isCurrent = phase.status === 'current'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.18 }}
      className={cn(
        'flex gap-4',
        cfg.opacity,
      )}
    >
      {/* Timeline */}
      <div className="flex flex-col items-center flex-shrink-0 pt-1">
        {cfg.dot}
        {index < PHASES.length - 1 && (
          <div className={cn(
            'w-px flex-1 mt-2',
            isCurrent ? 'bg-violet-500/20' : 'bg-white/[0.04]',
          )} />
        )}
      </div>

      {/* Card */}
      <div className={cn(
        'flex-1 pb-6 rounded-2xl',
        isCurrent ? 'glass border border-violet-500/15 p-4 -mt-1 mb-2' : '',
      )}>
        <div className="flex items-center gap-2.5 mb-1.5">
          <span className="text-[11px] font-mono text-slate-700">{phase.version}</span>
          <span className={cn('text-[9px] font-mono px-1.5 py-0.5 rounded border', cfg.badge)}>
            {cfg.badgeText}
          </span>
          {isCurrent && (
            <motion.span
              className="text-[8px] font-mono text-violet-500"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ● in progress
            </motion.span>
          )}
        </div>

        <div className="text-[14px] font-semibold text-slate-200 mb-1">{phase.title}</div>
        <p className="text-[11px] font-mono text-slate-600 mb-3 leading-relaxed">
          {phase.description}
        </p>

        <ul className="space-y-1">
          {phase.items.map(item => (
            <li key={item} className="flex items-start gap-2 text-[10px] font-mono text-slate-700">
              <span className="text-slate-800 mt-0.5 flex-shrink-0">—</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  )
}

export function RoadmapView() {
  const done = PHASES.filter(p => p.status === 'done').length
  const total = PHASES.length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.05] flex-shrink-0">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[9px] font-mono text-slate-700 uppercase tracking-widest mb-1">
              Roadmap
            </div>
            <div className="text-[15px] font-semibold text-slate-200">
              AgentOS development plan
            </div>
            <p className="text-[11px] font-mono text-slate-600 mt-0.5">
              From local prototype to open platform.
            </p>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-mono text-slate-700 mb-1">progress</div>
            <div className="text-[20px] font-semibold text-slate-300">
              {done}
              <span className="text-[13px] text-slate-700">/{total}</span>
            </div>
            <div className="text-[9px] font-mono text-slate-700">phases complete</div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5">
        {PHASES.map((phase, i) => (
          <PhaseCard key={phase.version} phase={phase} index={i} />
        ))}

        <div className="pt-4 pb-8 text-center text-[9px] font-mono text-slate-800">
          Roadmap is indicative — priorities shift with community feedback.
        </div>
      </div>
    </div>
  )
}
