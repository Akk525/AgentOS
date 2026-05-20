import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Circle, ChevronRight, ExternalLink, GitBranch, Network,
  Brain, Shield, ArrowRight, CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react'
import { cn } from '../lib/utils'

// ── Live preview data (static — landing doesn't mount OrchestratorProvider) ──

const PREVIEW_SESSIONS = [
  { name: 'Cipher',  role: 'debugger',      branch: 'fix/auth-race',        status: 'running',   tokens: 42.8, color: 'bg-cyan-400' },
  { name: 'Echo',    role: 'reviewer',      branch: 'fix/auth-race',        status: 'reviewing', tokens: 18.2, color: 'bg-violet-400' },
  { name: 'Atlas',   role: 'test-writer',   branch: 'test/payment-int',     status: 'running',   tokens: 34.6, color: 'bg-emerald-400' },
  { name: 'Rex',     role: 'refactorer',    branch: 'refactor/parser-v2',   status: 'blocked',   tokens: 12.4, color: 'bg-amber-400' },
  { name: 'Nexus',   role: 'architect',     branch: 'plan/monorepo',        status: 'running',   tokens: 28.9, color: 'bg-blue-400' },
  { name: 'Lyra',    role: 'planner',       branch: 'plan/auth-refactor',   status: 'planning',  tokens:  8.4, color: 'bg-violet-300' },
]

const STATUS_DOT: Record<string, string> = {
  running:   'bg-cyan-400',
  reviewing: 'bg-violet-400',
  blocked:   'bg-amber-400',
  planning:  'bg-violet-300',
}

const STATUS_LABEL: Record<string, string> = {
  running:   'running',
  reviewing: 'reviewing',
  blocked:   'blocked',
  planning:  'planning',
}

function LivePreview() {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 3000)
    return () => clearInterval(id)
  }, [])

  const jitter = (base: number) => (base + (tick % 2 === 0 ? Math.random() * 2.4 : -Math.random() * 1.2)).toFixed(1)

  return (
    <div className="glass rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.05] bg-white/[0.02]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-crimson-600/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
        </div>
        <div className="flex-1 text-center text-[10px] font-mono text-slate-700">
          AgentOS — Runtime
        </div>
        <motion.div
          className="text-[8px] font-mono text-emerald-600"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          ● live
        </motion.div>
      </div>

      {/* Session rows */}
      <div className="px-4 py-3 space-y-1.5">
        {PREVIEW_SESSIONS.map((s, i) => (
          <motion.div
            key={s.name}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.2 }}
            className="flex items-center gap-3 text-[10px] font-mono"
          >
            <div className="relative flex-shrink-0">
              <div className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[s.status] ?? 'bg-slate-600')} />
              {(s.status === 'running' || s.status === 'reviewing') && (
                <motion.div
                  className={cn('absolute inset-0 rounded-full', STATUS_DOT[s.status])}
                  animate={{ scale: [1, 2.5, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                />
              )}
            </div>
            <span className="w-12 text-slate-300 font-semibold">{s.name}</span>
            <span className={cn('text-[8px] w-20', s.status === 'blocked' ? 'text-amber-600' : 'text-slate-700')}>
              {s.role}
            </span>
            <span className="flex-1 text-slate-700 truncate">{s.branch}</span>
            <span className={cn('text-[9px]', s.status === 'blocked' ? 'text-amber-600/80' : 'text-slate-600')}>
              {STATUS_LABEL[s.status]}
            </span>
            <span className="text-slate-700 w-14 text-right">
              {s.status === 'running' ? jitter(s.tokens) : s.tokens.toFixed(1)}k
            </span>
          </motion.div>
        ))}
      </div>

      {/* Provider bars */}
      <div className="px-4 py-2.5 border-t border-white/[0.04] bg-white/[0.01]">
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'anthropic', used: 4, max: 5, color: 'bg-crimson-500/70' },
            { id: 'openai',    used: 1, max: 3, color: 'bg-emerald-500/60' },
            { id: 'ollama',    used: 0, max: 2, color: 'bg-slate-500/40' },
          ].map(p => (
            <div key={p.id}>
              <div className="flex justify-between text-[8px] font-mono text-slate-700 mb-1">
                <span>{p.id}</span>
                <span>{p.used}/{p.max}</span>
              </div>
              <div className="h-0.5 bg-white/[0.05] rounded-full overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full', p.color)}
                  animate={{ width: `${(p.used / p.max) * 100}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Feature cards ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: <Network size={20} />,
    color: 'text-cyan-400',
    border: 'border-cyan-500/15',
    title: 'Multi-session orchestration',
    desc: 'Run debugger, test-writer, reviewer, and planner sessions concurrently. Visualise dependencies, blockers, and review chains in a live graph.',
  },
  {
    icon: <GitBranch size={20} />,
    color: 'text-violet-400',
    border: 'border-violet-500/15',
    title: 'Runtime planning',
    desc: 'A planner session decomposes tasks into subtasks, assigns roles, and coordinates reviewers — without you managing the logistics manually.',
  },
  {
    icon: <Brain size={20} />,
    color: 'text-amber-400',
    border: 'border-amber-500/15',
    title: 'Interpretable decisions',
    desc: 'Every orchestration decision is logged: why a session was assigned, why a queue delay occurred, why a blocker was flagged. No black boxes.',
  },
  {
    icon: <Shield size={20} />,
    color: 'text-emerald-400',
    border: 'border-emerald-500/15',
    title: 'Human supervision',
    desc: 'Override any assignment. Escalate any blocker. Pause any session. The runtime suggests; you decide. Controlled autonomy by design.',
  },
]

// ── Differentiators ───────────────────────────────────────────────────────────

const NOT_IS = [
  { not: 'A chatbot interface',          is: 'An operational runtime layer'  },
  { not: 'Autonomous AGI',              is: 'Supervised delegation'          },
  { not: 'An IDE replacement',          is: 'Infrastructure for agents'      },
  { not: 'Magic AI that replaces you',  is: 'Tools that keep you in control' },
]

// ── Main component ────────────────────────────────────────────────────────────

interface LandingProps {
  onEnter: () => void
}

export function Landing({ onEnter }: LandingProps) {
  return (
    <div
      className="min-h-screen overflow-y-auto"
      style={{ background: '#06060a', color: '#e2e8f0' }}
    >
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 grid-overlay opacity-40" />
        <div className="absolute -top-40 -left-40 w-[800px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(159,18,57,0.10) 0%, transparent 65%)' }} />
        <div className="absolute top-1/3 right-0 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(109,40,217,0.06) 0%, transparent 65%)' }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6">

        {/* ── Nav ── */}
        <nav className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-crimson-600 flex items-center justify-center shadow-[0_0_16px_rgba(244,63,94,0.35)]">
              <Circle size={12} className="text-white fill-white" />
            </div>
            <span className="text-[14px] font-semibold text-white tracking-tight">AgentOS</span>
            <span className="text-[10px] font-mono text-slate-600 ml-1">v1.3 alpha</span>
          </div>
          <div className="flex items-center gap-4 text-[12px] font-mono">
            <a href="https://github.com/your-org/agentos" target="_blank" rel="noreferrer"
              className="text-slate-600 hover:text-slate-300 transition-colors flex items-center gap-1">
              GitHub <ExternalLink size={10} />
            </a>
            <a href="#architecture" className="text-slate-600 hover:text-slate-300 transition-colors">
              Docs
            </a>
            <button
              onClick={onEnter}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.10] text-slate-300 hover:text-white hover:bg-white/[0.10] transition-all"
            >
              Demo <ChevronRight size={11} />
            </button>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="pt-16 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-[11px] font-mono text-crimson-400 uppercase tracking-widest mb-5">
              Open source · Apache 2.0 · Local-first
            </div>

            <h1 className="text-5xl font-semibold text-white leading-[1.1] tracking-tight mb-6 max-w-2xl">
              Local-first runtime for<br />
              <span className="text-slate-400">steerable coding agents.</span>
            </h1>

            <p className="text-[16px] text-slate-500 leading-relaxed max-w-xl mb-10 font-mono">
              Supervise multi-agent orchestration. Understand every decision.
              Override anything. Stay in control.
            </p>

            <div className="flex items-center gap-4 mb-16">
              <button
                onClick={onEnter}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-crimson-600 text-white text-[13px] font-mono hover:bg-crimson-500 transition-colors shadow-[0_0_24px_rgba(244,63,94,0.25)]"
              >
                Launch demo
                <ArrowRight size={14} />
              </button>
              <a
                href="https://github.com/your-org/agentos"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.05] border border-white/[0.10] text-slate-300 text-[13px] font-mono hover:bg-white/[0.08] transition-colors"
              >
                GitHub
                <ExternalLink size={12} />
              </a>
            </div>

            {/* Live preview */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
            >
              <LivePreview />
            </motion.div>
          </motion.div>
        </section>

        {/* ── Not / Is ── */}
        <section className="py-16 border-t border-white/[0.05]">
          <div className="text-[10px] font-mono text-slate-700 uppercase tracking-widest mb-8">
            What AgentOS is
          </div>
          <div className="grid grid-cols-1 gap-3">
            {NOT_IS.map((row, i) => (
              <motion.div
                key={row.not}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.2 }}
                className="flex items-center gap-4"
              >
                <div className="text-[12px] font-mono text-slate-700 line-through w-52 flex-shrink-0">
                  {row.not}
                </div>
                <div className="text-slate-800">→</div>
                <div className="flex items-center gap-2 text-[12px] font-mono text-slate-300">
                  <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0" />
                  {row.is}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section className="py-16 border-t border-white/[0.05]">
          <div className="text-[10px] font-mono text-slate-700 uppercase tracking-widest mb-3">
            Capabilities
          </div>
          <h2 className="text-2xl font-semibold text-white mb-10">
            Everything the runtime surfaces.
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.22 }}
                className={cn('glass rounded-2xl border p-6', f.border)}
              >
                <div className={cn('mb-3', f.color)}>{f.icon}</div>
                <div className="text-[14px] font-semibold text-slate-200 mb-2">{f.title}</div>
                <p className="text-[11px] font-mono text-slate-600 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Architecture ── */}
        <section id="architecture" className="py-16 border-t border-white/[0.05]">
          <div className="text-[10px] font-mono text-slate-700 uppercase tracking-widest mb-3">
            Architecture
          </div>
          <h2 className="text-2xl font-semibold text-white mb-4">
            Designed for real execution.
          </h2>
          <p className="text-[12px] font-mono text-slate-600 leading-relaxed mb-8 max-w-xl">
            The runtime architecture is built to replace the simulation layer with real PTY execution,
            git worktrees, and provider calls — without changing the UI or orchestration layers.
          </p>

          <div className="glass rounded-2xl border border-white/[0.07] p-6 font-mono text-[11px] leading-relaxed">
            <pre className="text-slate-600 overflow-x-auto">{`┌──────────────────────────────────────────────────────────┐
│                    UI Layer (React)                      │
│  Dashboard · Orchestration · Plan · Reviews · Reasoning  │
└───────────────────────┬──────────────────────────────────┘
                        │ useOrchestrator / useRuntime
┌───────────────────────▼──────────────────────────────────┐
│  OrchestratorContext          RuntimeContext             │
│  • activeSessions             • session state            │
│  • runtimePlans               • patch lifecycle          │
│  • reasoning log              • worktree tracking        │
│  • blockers                   • provider health          │
└───────┬───────────────────────────────────┬──────────────┘
        │ subscribe()                       │ subscribe()
┌───────▼──────────────┐       ┌────────────▼─────────────┐
│  OrchestratorRuntime │       │     RuntimeEngine        │
└──────────────────────┘       └────────────┬─────────────┘
                                            │
                                ┌───────────▼──────────────┐
                                │   RuntimeDaemon          │
                                │   ProviderBridge         │
                                │   ProviderRegistry       │
                                └──────────────────────────┘`}</pre>
          </div>

          <div className="mt-4 flex items-start gap-2 text-[10px] font-mono text-slate-700">
            <AlertTriangle size={10} className="text-amber-700 mt-0.5 flex-shrink-0" />
            Currently a browser simulation. Real PTY execution, Tauri IPC, and git worktrees are v2.x milestones.
          </div>
        </section>

        {/* ── Roadmap strip ── */}
        <section className="py-16 border-t border-white/[0.05]">
          <div className="text-[10px] font-mono text-slate-700 uppercase tracking-widest mb-8">
            Roadmap
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Now',      items: ['v1.x — OSS readiness', 'Onboarding + docs', 'CI + security'] },
              { label: 'Next',     items: ['v2.0 — Real PTY', 'v2.1 — Tauri desktop', 'v2.2 — Git worktrees'] },
              { label: 'Future',   items: ['v3.x — Remote runners', 'v3.x — MCP integration', 'v4.x — Runtime APIs'] },
            ].map((col, i) => (
              <motion.div
                key={col.label}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.2 }}
                className="glass rounded-xl border border-white/[0.06] p-4"
              >
                <div className={cn('text-[9px] font-mono uppercase tracking-widest mb-3', i === 0 ? 'text-crimson-400' : 'text-slate-700')}>
                  {col.label}
                </div>
                <ul className="space-y-1.5">
                  {col.items.map(item => (
                    <li key={item} className="flex items-center gap-2 text-[10px] font-mono text-slate-600">
                      <Clock size={8} className={i === 0 ? 'text-crimson-500' : 'text-slate-800'} />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── OSS CTA ── */}
        <section className="py-16 border-t border-white/[0.05]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <div className="text-[10px] font-mono text-slate-700 uppercase tracking-widest mb-4">
              Open source
            </div>
            <h2 className="text-2xl font-semibold text-white mb-3">
              Built to be extended.
            </h2>
            <p className="text-[13px] font-mono text-slate-600 mb-8 max-w-md mx-auto leading-relaxed">
              Apache 2.0. Event-driven architecture designed for real execution layers.
              Contributions welcome.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={onEnter}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-crimson-600 text-white text-[13px] font-mono hover:bg-crimson-500 transition-colors shadow-[0_0_24px_rgba(244,63,94,0.25)]"
              >
                Launch demo
                <ArrowRight size={14} />
              </button>
              <a
                href="https://github.com/your-org/agentos"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.05] border border-white/[0.10] text-slate-300 text-[13px] font-mono hover:bg-white/[0.08] transition-colors"
              >
                View on GitHub
                <ExternalLink size={12} />
              </a>
            </div>
          </motion.div>
        </section>

        {/* ── Footer ── */}
        <footer className="py-8 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono text-slate-800">
          <span>© 2025 AgentOS Contributors — Apache 2.0</span>
          <div className="flex items-center gap-4">
            <a href="https://github.com/your-org/agentos" className="hover:text-slate-600 transition-colors">GitHub</a>
            <span>·</span>
            <span>CONTRIBUTING.md</span>
            <span>·</span>
            <span>SECURITY.md</span>
          </div>
        </footer>

      </div>
    </div>
  )
}
