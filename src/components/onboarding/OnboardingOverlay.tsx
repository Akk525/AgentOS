import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Circle, Network, GitBranch, Brain, Shield, ChevronRight, X } from 'lucide-react'
import { cn } from '../../lib/utils'

type Step = 'welcome' | 'boot' | 'features'

interface BootLine {
  text: string
  delay: number
  color?: string
}

const BOOT_LINES: BootLine[] = [
  { text: '→ initializing runtime daemon',             delay: 100  },
  { text: '✓ daemon online (82ms)',                    delay: 500,  color: 'text-emerald-400' },
  { text: '→ scanning provider registry',              delay: 900  },
  { text: '  anthropic    connected (claude-sonnet-4-6)', delay: 1200, color: 'text-emerald-400' },
  { text: '  openai       connected (gpt-4o)',         delay: 1500, color: 'text-emerald-400' },
  { text: '  ollama       available (llama3.2)',        delay: 1700, color: 'text-emerald-400' },
  { text: '✓ 3 providers loaded',                      delay: 2000, color: 'text-emerald-400' },
  { text: '→ loading orchestration layer',             delay: 2300 },
  { text: '✓ 6 active sessions detected',              delay: 2700, color: 'text-cyan-400' },
  { text: '✓ 1 runtime plan active — auth-refactor',   delay: 3000, color: 'text-violet-400' },
  { text: '✓ 2 blockers flagged — 1 auto-resolved',   delay: 3200, color: 'text-amber-400' },
  { text: '✓ runtime ready',                           delay: 3600, color: 'text-emerald-300' },
]

const FEATURE_CARDS = [
  {
    icon: <Network size={18} />,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/8 border-cyan-500/20',
    title: 'Orchestration Graph',
    desc: 'Visualise active sessions, dependencies, and review chains in real time.',
  },
  {
    icon: <GitBranch size={18} />,
    color: 'text-violet-400',
    bg: 'bg-violet-500/8 border-violet-500/20',
    title: 'Runtime Planning',
    desc: 'Planner sessions decompose tasks and delegate work across parallel agents.',
  },
  {
    icon: <Brain size={18} />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/8 border-amber-500/20',
    title: 'Reasoning Log',
    desc: 'Every orchestration decision is explained — assignments, queues, blockers, escalations.',
  },
  {
    icon: <Shield size={18} />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/8 border-emerald-500/20',
    title: 'Human Controls',
    desc: 'Override assignments, escalate blockers, and steer the runtime at any point.',
  },
]

function BootSequence({ onDone }: { onDone: () => void }) {
  const [visibleLines, setVisibleLines] = useState<number[]>([])

  useEffect(() => {
    BOOT_LINES.forEach((line, i) => {
      setTimeout(() => {
        setVisibleLines(prev => [...prev, i])
      }, line.delay)
    })
    const totalDuration = BOOT_LINES[BOOT_LINES.length - 1].delay + 800
    const timer = setTimeout(onDone, totalDuration)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div className="font-mono text-[11px] space-y-1 text-left max-w-md w-full">
      {BOOT_LINES.map((line, i) => (
        <AnimatePresence key={i}>
          {visibleLines.includes(i) && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
              className={cn('leading-relaxed', line.color ?? 'text-slate-500')}
            >
              {line.text}
            </motion.div>
          )}
        </AnimatePresence>
      ))}
      {visibleLines.length < BOOT_LINES.length && (
        <motion.span
          className="inline-block w-2 h-3 bg-slate-500 ml-0.5"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}
    </div>
  )
}

interface OnboardingOverlayProps {
  onComplete: () => void
}

export function OnboardingOverlay({ onComplete }: OnboardingOverlayProps) {
  const [step, setStep] = useState<Step>('welcome')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(6,6,10,0.96)', backdropFilter: 'blur(16px)' }}
    >
      {/* Skip */}
      <button
        onClick={onComplete}
        className="absolute top-6 right-6 flex items-center gap-1.5 text-[11px] font-mono text-slate-600 hover:text-slate-400 transition-colors"
      >
        <X size={12} />
        Skip
      </button>

      <AnimatePresence mode="wait">

        {/* ── Step 1: Welcome ────────────────────────────────────────────────── */}
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center max-w-lg px-8"
          >
            {/* Logo */}
            <div className="w-16 h-16 rounded-2xl bg-crimson-600 flex items-center justify-center shadow-[0_0_48px_rgba(244,63,94,0.35)] mb-6">
              <Circle size={28} className="text-white fill-white" />
            </div>

            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">
              AgentOS v1.1 — alpha
            </div>

            <h1 className="text-2xl font-semibold text-white mb-3 leading-tight">
              Local-first runtime for<br />steerable coding agents.
            </h1>

            <p className="text-[13px] text-slate-500 leading-relaxed mb-8 max-w-sm">
              Supervise intelligent sessions. Understand every orchestration decision.
              Stay in control.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={onComplete}
                className="text-[11px] font-mono text-slate-600 hover:text-slate-400 transition-colors px-4 py-2"
              >
                Skip intro
              </button>
              <button
                onClick={() => setStep('boot')}
                className="flex items-center gap-2 text-[12px] font-mono px-5 py-2.5 rounded-xl bg-crimson-600 text-white hover:bg-crimson-500 transition-colors shadow-[0_0_20px_rgba(244,63,94,0.3)]"
              >
                Boot runtime
                <ChevronRight size={13} />
              </button>
            </div>

            {/* Tagline */}
            <div className="mt-12 flex items-center gap-6 text-[9px] font-mono text-slate-800">
              <span>event-driven</span>
              <span>·</span>
              <span>local-first</span>
              <span>·</span>
              <span>controlled autonomy</span>
              <span>·</span>
              <span>open source</span>
            </div>
          </motion.div>
        )}

        {/* ── Step 2: Boot ───────────────────────────────────────────────────── */}
        {step === 'boot' && (
          <motion.div
            key="boot"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-start max-w-md w-full px-8"
          >
            <div className="text-[9px] font-mono text-slate-700 uppercase tracking-widest mb-5">
              Runtime boot sequence
            </div>
            <BootSequence onDone={() => setStep('features')} />
          </motion.div>
        )}

        {/* ── Step 3: Features ───────────────────────────────────────────────── */}
        {step === 'features' && (
          <motion.div
            key="features"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center max-w-2xl w-full px-8"
          >
            <div className="text-[9px] font-mono text-emerald-600 uppercase tracking-widest mb-2">
              Runtime ready
            </div>
            <h2 className="text-xl font-semibold text-white mb-2 text-center">
              What you can do
            </h2>
            <p className="text-[12px] text-slate-600 font-mono mb-8 text-center">
              Explore an active orchestration — 6 sessions, 1 plan, live review chain.
            </p>

            <div className="grid grid-cols-2 gap-3 w-full mb-8">
              {FEATURE_CARDS.map((card, i) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.2 }}
                  className={cn('rounded-xl border p-4', card.bg)}
                >
                  <div className={cn('mb-2', card.color)}>{card.icon}</div>
                  <div className="text-[12px] font-semibold text-slate-200 mb-1">{card.title}</div>
                  <p className="text-[10px] font-mono text-slate-600 leading-relaxed">{card.desc}</p>
                </motion.div>
              ))}
            </div>

            <button
              onClick={onComplete}
              className="flex items-center gap-2 text-[12px] font-mono px-6 py-3 rounded-xl bg-violet-500/15 border border-violet-500/25 text-violet-300 hover:bg-violet-500/20 transition-colors"
            >
              Enter runtime
              <ChevronRight size={13} />
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  )
}
