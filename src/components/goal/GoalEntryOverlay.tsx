import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Circle, ChevronRight, Target } from 'lucide-react'
import { cn } from '../../lib/utils'
import { planFromGoal } from '../../runtime/mockPlanner'
import { orchestratorRuntime } from '../../runtime/orchestratorRuntime'
import { providerRegistry } from '../../runtime/providers/providerRegistry'
import { PROVIDER_DEFAULT_MODELS } from '../../runtime/inference/modelRouting'
import { InferenceError } from '../../runtime/inference/types'
import type { GovernanceMode } from '../../types/graph'
import type { ProviderHealth } from '../../types'
import type { PlanningPhase } from '../../runtime/agents/plannerAgent'

type OverlayState = 'idle' | 'planning' | 'error'

const GOVERNANCE_OPTIONS: { value: GovernanceMode; label: string; hint: string }[] = [
  { value: 'assisted', label: 'Assisted', hint: 'Auto build/test/review; you approve merge' },
  { value: 'manual', label: 'Manual', hint: 'You run each stage; merge needs approval' },
  { value: 'autonomous', label: 'Autonomous', hint: 'Auto through review; merge without click' },
  { value: 'full_auto', label: 'Full Auto', hint: 'Minimal gates; auto-merge on reviewer approve' },
]

const PROVIDER_OPTIONS = [
  { id: 'ollama', label: 'Ollama (local)', glyph: '🦙' },
  { id: 'anthropic', label: 'Anthropic', glyph: '◆' },
  { id: 'openai', label: 'OpenAI', glyph: '⬡' },
] as const

const PLANNING_PHASES: { phase: PlanningPhase; label: string }[] = [
  { phase: 'calling_provider', label: '→ calling LLM provider' },
  { phase: 'parsing_plan', label: '→ parsing plan structure' },
  { phase: 'writing_graph', label: '→ writing task graph' },
]

function providerHint(providerId: string, health: ProviderHealth | null): string | null {
  if (!health) return null
  if (health.state === 'connected' || health.state === 'latency_high') return null
  if (providerId === 'ollama' && health.state === 'unreachable') {
    return 'Start Ollama locally (ollama serve) and pull a model.'
  }
  if (health.state === 'unconfigured' || health.state === 'unauthorized') {
    if (providerId === 'ollama') return 'Ollama is not reachable on localhost:11434.'
    return `Set VITE_${providerId.toUpperCase()}_API_KEY in your environment.`
  }
  return health.errorMessage ?? `${providerId} is not available.`
}

function formatInferenceError(err: unknown, providerId: string): string {
  if (err instanceof InferenceError) {
    if (err.code === 'unconfigured') {
      return providerId === 'ollama'
        ? `${err.message} Start Ollama locally (ollama serve).`
        : `${err.message} Set VITE_${providerId.toUpperCase()}_API_KEY.`
    }
    return err.message
  }
  if (err instanceof Error) return err.message
  return 'Failed to create plan'
}

interface GoalEntryOverlayProps {
  onComplete: () => void
}

export function GoalEntryOverlay({ onComplete }: GoalEntryOverlayProps) {
  const [goalText, setGoalText] = useState('')
  const [governanceMode, setGovernanceMode] = useState<GovernanceMode>('assisted')
  const [providerId, setProviderId] = useState('ollama')
  const [modelId, setModelId] = useState(PROVIDER_DEFAULT_MODELS.ollama)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [providerHealth, setProviderHealth] = useState<ProviderHealth | null>(null)
  const [checkingProvider, setCheckingProvider] = useState(false)
  const [overlayState, setOverlayState] = useState<OverlayState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [planningPhase, setPlanningPhase] = useState<PlanningPhase | null>(null)
  const [planningDone, setPlanningDone] = useState(false)

  const refreshProvider = useCallback(async (id: string) => {
    setCheckingProvider(true)
    try {
      const bridge = providerRegistry.get(id)
      if (!bridge) {
        setProviderHealth(null)
        setAvailableModels([])
        return
      }
      const [health, models] = await Promise.all([bridge.ping(), bridge.getModels()])
      setProviderHealth(health)
      const modelList = models.length > 0 ? models : [PROVIDER_DEFAULT_MODELS[id] ?? 'default']
      setAvailableModels(modelList)
      setModelId(prev => (modelList.includes(prev) ? prev : modelList[0]))
    } finally {
      setCheckingProvider(false)
    }
  }, [])

  useEffect(() => {
    void refreshProvider(providerId)
  }, [providerId, refreshProvider])

  const providerUnavailable = providerHealth !== null &&
    providerHealth.state !== 'connected' &&
    providerHealth.state !== 'latency_high'

  const hint = providerHint(providerId, providerHealth)

  async function handleSubmit() {
    const trimmed = goalText.trim()
    if (!trimmed || overlayState === 'planning' || providerUnavailable) return

    setOverlayState('planning')
    setErrorMessage('')
    setPlanningPhase(null)
    setPlanningDone(false)

    try {
      await planFromGoal(trimmed, {
        governanceMode,
        providerId,
        modelId,
        onPhase: phase => setPlanningPhase(phase),
      })
      setPlanningDone(true)
      await orchestratorRuntime.refreshFromStore()
      onComplete()
    } catch (err) {
      setOverlayState('error')
      setErrorMessage(formatInferenceError(err, providerId))
    }
  }

  const phaseIndex = planningPhase
    ? PLANNING_PHASES.findIndex(p => p.phase === planningPhase)
    : -1

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[250] flex items-center justify-center"
      style={{ background: 'rgba(6,6,10,0.96)', backdropFilter: 'blur(16px)' }}
    >
      <AnimatePresence mode="wait">
        {overlayState === 'planning' ? (
          <motion.div
            key="planning"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center max-w-md w-full px-8"
          >
            <div className="w-12 h-12 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center mb-6">
              <Target size={22} className="text-violet-300" />
            </div>
            <div className="text-[10px] font-mono text-violet-400 uppercase tracking-widest mb-2">
              Planner active
            </div>
            <h2 className="text-lg font-semibold text-white mb-6 text-center">
              Lyra is decomposing your goal…
            </h2>
            <div className="font-mono text-[11px] space-y-1.5 text-left w-full max-w-xs">
              {PLANNING_PHASES.map((item, i) => (
                <motion.div
                  key={item.phase}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{
                    opacity: i <= phaseIndex || planningDone ? 1 : 0.2,
                    x: 0,
                  }}
                  className="leading-relaxed text-slate-500"
                >
                  {item.label}
                </motion.div>
              ))}
              {planningDone && (
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="leading-relaxed text-emerald-400"
                >
                  ✓ plan ready
                </motion.div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex flex-col items-center max-w-lg w-full px-8"
          >
            <div className="w-14 h-14 rounded-2xl bg-crimson-600 flex items-center justify-center shadow-[0_0_48px_rgba(244,63,94,0.35)] mb-5">
              <Circle size={24} className="text-white fill-white" />
            </div>

            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">
              New project
            </div>
            <h1 className="text-xl font-semibold text-white mb-2 text-center">
              Describe what you want built
            </h1>
            <p className="text-[12px] text-slate-500 font-mono text-center mb-6 max-w-sm leading-relaxed">
              AgentOS will call your chosen LLM to generate a task graph with epics, tasks, and acceptance criteria.
            </p>

            <div className="w-full space-y-4">
              <textarea
                value={goalText}
                onChange={e => setGoalText(e.target.value)}
                placeholder="e.g. Build a REST API for task management with auth and tests…"
                rows={5}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[13px] text-slate-200 placeholder:text-slate-600 font-mono resize-none focus:outline-none focus:border-crimson-500/40 focus:ring-1 focus:ring-crimson-500/20"
                autoFocus
              />

              <div>
                <label className="text-[10px] font-mono text-slate-600 uppercase tracking-wider mb-2 block">
                  Provider
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PROVIDER_OPTIONS.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setProviderId(p.id)
                        setModelId(PROVIDER_DEFAULT_MODELS[p.id] ?? '')
                      }}
                      className={cn(
                        'rounded-lg border px-2 py-2 text-[10px] font-mono transition-colors',
                        providerId === p.id
                          ? 'border-violet-500/40 bg-violet-500/10 text-violet-200'
                          : 'border-white/[0.08] bg-white/[0.02] text-slate-500 hover:border-white/[0.12]',
                      )}
                    >
                      <span className="mr-1">{p.glyph}</span>
                      {p.label.split(' ')[0]}
                    </button>
                  ))}
                </div>
                {checkingProvider && (
                  <p className="text-[10px] font-mono text-slate-600 mt-2">Checking provider…</p>
                )}
                {!checkingProvider && hint && (
                  <p className="text-[10px] font-mono text-amber-400/90 mt-2">{hint}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <label className="text-[10px] font-mono text-slate-600 uppercase tracking-wider shrink-0 w-16">
                  Model
                </label>
                <select
                  value={modelId}
                  onChange={e => setModelId(e.target.value)}
                  className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] font-mono text-slate-300 focus:outline-none focus:border-violet-500/30"
                >
                  {availableModels.map(m => (
                    <option key={m} value={m} className="bg-[#0c0c12]">
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-[10px] font-mono text-slate-600 uppercase tracking-wider shrink-0">
                  Governance
                </label>
                <select
                  value={governanceMode}
                  onChange={e => setGovernanceMode(e.target.value as GovernanceMode)}
                  className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] font-mono text-slate-300 focus:outline-none focus:border-violet-500/30"
                >
                  {GOVERNANCE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-[#0c0c12]">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] font-mono text-slate-600 -mt-2">
                {GOVERNANCE_OPTIONS.find(o => o.value === governanceMode)?.hint}
              </p>

              {overlayState === 'error' && errorMessage && (
                <p className="text-[11px] font-mono text-crimson-400">{errorMessage}</p>
              )}

              <button
                onClick={() => void handleSubmit()}
                disabled={!goalText.trim() || providerUnavailable || checkingProvider}
                className={cn(
                  'w-full flex items-center justify-center gap-2 text-[12px] font-mono px-5 py-3 rounded-xl transition-colors',
                  goalText.trim() && !providerUnavailable && !checkingProvider
                    ? 'bg-crimson-600 text-white hover:bg-crimson-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                    : 'bg-white/[0.04] text-slate-600 cursor-not-allowed',
                )}
              >
                Create plan
                <ChevronRight size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
