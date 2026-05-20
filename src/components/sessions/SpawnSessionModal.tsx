import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ChevronRight, Check, GitBranch, Zap, Cpu,
  CheckCircle2, Loader2, Circle, FolderGit2, Shield,
  ArrowRight, Sparkles, XCircle, AlertTriangle,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useRuntime } from '../../context/RuntimeContext'
import { mockWorkspaces } from '../../data/mockWorkspaces'
import { mockAgents } from '../../data/mockAgents'
import type { Workspace, Agent, SessionLaunchConfig, LaunchStepStatus } from '../../types'

// ── Step definitions ──────────────────────────────────────────────────────────

type WizardStep = 'workspace' | 'agent' | 'branch' | 'config' | 'summary' | 'launch'

const WIZARD_STEPS: { id: WizardStep; label: string }[] = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'agent',     label: 'Agent'     },
  { id: 'branch',    label: 'Branch'    },
  { id: 'config',    label: 'Config'    },
  { id: 'summary',   label: 'Review'    },
]

const PROVIDER_OPTIONS = [
  { id: 'anthropic', name: 'Anthropic', models: ['claude-sonnet-4-6', 'claude-opus-4-7', 'claude-haiku-4-5-20251001'] },
  { id: 'openai',    name: 'OpenAI',    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo']                              },
  { id: 'ollama',    name: 'Ollama',    models: ['llama3.2', 'codellama', 'mistral']                                  },
]

interface LaunchStep {
  id: string
  label: string
  getDetail: (cfg: SessionLaunchConfig) => string
  delay: number
  duration: number
}

const LAUNCH_SEQUENCE: LaunchStep[] = [
  { id: 'validate',  label: 'Validating workspace',  getDetail: c => c.rootPath,          delay: 0,    duration: 500  },
  { id: 'worktree',  label: 'Creating worktree',     getDetail: c => `Branch: ${c.branchName}`, delay: 500,  duration: 900  },
  { id: 'runtime',   label: 'Mounting runtime',      getDetail: () => 'Filesystem + sandbox',  delay: 1400, duration: 600  },
  { id: 'provider',  label: 'Attaching provider',    getDetail: c => `${c.providerName} / ${c.modelId}`, delay: 2000, duration: 500 },
  { id: 'agent',     label: 'Loading agent',         getDetail: c => c.agentName,         delay: 2500, duration: 400  },
  { id: 'session',   label: 'Initializing session',  getDetail: () => 'Autonomous mode',  delay: 2900, duration: 350  },
]

const BRANCH_SUGGESTIONS = [
  'fix/auth-race',
  'feature/dashboard-v2',
  'refactor/payment-module',
  'test/integration-suite',
  'chore/dependency-update',
]

const ROLE_COLORS: Record<string, string> = {
  debugger:    'text-crimson-400 bg-crimson-500/10 border-crimson-500/20',
  reviewer:    'text-violet-400 bg-violet-500/10 border-violet-500/20',
  'test-writer': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  refactorer:  'text-amber-400 bg-amber-500/10 border-amber-500/20',
  architect:   'text-blue-400 bg-blue-500/10 border-blue-500/20',
  general:     'text-slate-400 bg-slate-500/10 border-slate-500/20',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepNav({ current, steps }: { current: WizardStep; steps: typeof WIZARD_STEPS }) {
  const idx = steps.findIndex(s => s.id === current)
  return (
    <div className="flex flex-col gap-1 w-32 flex-shrink-0">
      {steps.map((step, i) => {
        const done   = i < idx
        const active = i === idx
        return (
          <div key={step.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
            <div className={cn(
              'w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[8px] font-mono transition-all',
              done   ? 'bg-emerald-500/20 border border-emerald-500/40'
              : active ? 'bg-cyan-500/20 border border-cyan-500/40'
              : 'bg-white/[0.03] border border-white/[0.07]',
            )}>
              {done
                ? <Check size={7} className="text-emerald-400" />
                : <span className={active ? 'text-cyan-400' : 'text-slate-700'}>{i + 1}</span>
              }
            </div>
            <span className={cn(
              'text-[11px] font-mono transition-colors',
              done   ? 'text-slate-600'
              : active ? 'text-slate-200'
              : 'text-slate-700',
            )}>{step.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function WorkspaceStep({ selected, onSelect }: {
  selected: Workspace | null
  onSelect: (ws: Workspace) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-mono text-slate-600 mb-1">Select the repository for this session.</p>
      {mockWorkspaces.map(ws => (
        <button
          key={ws.id}
          onClick={() => onSelect(ws)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left',
            selected?.id === ws.id
              ? 'border-cyan-500/30 bg-cyan-500/8 text-slate-200'
              : 'border-white/[0.05] hover:border-white/[0.10] hover:bg-white/[0.03] text-slate-400',
          )}
        >
          <FolderGit2 size={13} className={selected?.id === ws.id ? 'text-cyan-400' : 'text-slate-600'} />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold">{ws.name}</div>
            <div className="text-[10px] font-mono text-slate-700 truncate">{ws.rootPath}</div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={cn(
              'text-[9px] font-mono px-1.5 py-0.5 rounded',
              ws.healthStatus === 'healthy'  ? 'text-emerald-500 bg-emerald-500/10'
              : ws.healthStatus === 'degraded' ? 'text-amber-500 bg-amber-500/10'
              : 'text-crimson-400 bg-crimson-400/10',
            )}>{ws.healthStatus}</span>
            {selected?.id === ws.id && <Check size={11} className="text-cyan-400" />}
          </div>
        </button>
      ))}
    </div>
  )
}

function AgentStep({ selected, onSelect }: {
  selected: Agent | null
  onSelect: (agent: Agent) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-mono text-slate-600 mb-1">Choose an agent for this session.</p>
      {mockAgents.slice(0, 4).map(agent => (
        <button
          key={agent.id}
          onClick={() => onSelect(agent)}
          className={cn(
            'w-full flex items-start gap-3 px-3 py-2.5 rounded-xl border transition-all text-left',
            selected?.id === agent.id
              ? 'border-cyan-500/30 bg-cyan-500/8'
              : 'border-white/[0.05] hover:border-white/[0.10] hover:bg-white/[0.03]',
          )}
        >
          <div className={cn('flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[8px] font-mono border', ROLE_COLORS[agent.role] ?? ROLE_COLORS.general)}>
            {agent.role}
          </div>
          <div className="flex-1 min-w-0">
            <div className={cn('text-[12px] font-semibold', selected?.id === agent.id ? 'text-slate-200' : 'text-slate-400')}>
              {agent.name}
            </div>
            <div className="text-[10px] font-mono text-slate-700 truncate mt-0.5">{agent.description.slice(0, 60)}…</div>
            <div className="flex items-center gap-3 mt-1 text-[9px] font-mono text-slate-700">
              <span>{agent.tasksCompleted} tasks</span>
              <span>{Math.round(agent.successRate * 100)}% success</span>
              <span>{agent.model.split('-').slice(-2).join('-')}</span>
            </div>
          </div>
          {selected?.id === agent.id && <Check size={11} className="text-cyan-400 flex-shrink-0 mt-1" />}
        </button>
      ))}
    </div>
  )
}

function BranchStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[11px] font-mono text-slate-600 mb-3">
          Name the worktree branch. An isolated environment will be created for this session.
        </p>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.02] focus-within:border-cyan-500/30 transition-colors">
          <GitBranch size={11} className="text-slate-600 flex-shrink-0" />
          <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="e.g. fix/auth-race-condition"
            className="flex-1 bg-transparent text-[12px] font-mono text-slate-200 placeholder:text-slate-700 outline-none"
            autoFocus
          />
        </div>
      </div>
      <div>
        <div className="text-[9px] font-mono text-slate-700 uppercase tracking-widest mb-2">Suggestions</div>
        <div className="flex flex-wrap gap-1.5">
          {BRANCH_SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => onChange(s)}
              className={cn(
                'px-2 py-1 rounded-lg text-[10px] font-mono border transition-all',
                value === s
                  ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                  : 'border-white/[0.06] text-slate-600 hover:border-white/[0.12] hover:text-slate-400',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ConfigStep({ providerId, modelId, onChange }: {
  providerId: string
  modelId: string
  onChange: (providerId: string, modelId: string) => void
}) {
  const provider = PROVIDER_OPTIONS.find(p => p.id === providerId) ?? PROVIDER_OPTIONS[0]
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-[9px] font-mono text-slate-700 uppercase tracking-widest mb-2">Provider</div>
        <div className="grid grid-cols-3 gap-2">
          {PROVIDER_OPTIONS.map(p => (
            <button
              key={p.id}
              onClick={() => onChange(p.id, p.models[0])}
              className={cn(
                'px-2 py-2 rounded-xl text-[11px] font-mono border text-center transition-all',
                providerId === p.id
                  ? 'border-cyan-500/30 bg-cyan-500/8 text-cyan-400'
                  : 'border-white/[0.05] text-slate-600 hover:border-white/[0.10] hover:text-slate-400',
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[9px] font-mono text-slate-700 uppercase tracking-widest mb-2">Model</div>
        <div className="flex flex-col gap-1.5">
          {provider.models.map(m => (
            <button
              key={m}
              onClick={() => onChange(providerId, m)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left text-[11px] font-mono transition-all',
                modelId === m
                  ? 'border-cyan-500/30 bg-cyan-500/8 text-slate-200'
                  : 'border-white/[0.05] text-slate-600 hover:border-white/[0.10]',
              )}
            >
              {m}
              {modelId === m && <Check size={10} className="text-cyan-400" />}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
        <Shield size={10} className="text-slate-600 flex-shrink-0" />
        <span className="text-[10px] font-mono text-slate-600">Permissions: filesystem read/write, git, shell (sandboxed)</span>
      </div>
    </div>
  )
}

function SummaryStep({ config }: { config: SessionLaunchConfig }) {
  const rows = [
    { label: 'Workspace', value: config.workspaceName, sub: config.rootPath },
    { label: 'Agent',     value: config.agentName      },
    { label: 'Branch',    value: config.branchName     },
    { label: 'Provider',  value: config.providerName   },
    { label: 'Model',     value: config.modelId        },
  ]
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-mono text-slate-600">
        Review the session configuration before launching.
      </p>
      <div className="glass rounded-xl border border-white/[0.06] overflow-hidden">
        {rows.map((row, i) => (
          <div key={row.label} className={cn(
            'flex items-center gap-3 px-4 py-2.5 text-[11px] font-mono',
            i > 0 && 'border-t border-white/[0.04]',
          )}>
            <span className="text-slate-700 w-20 flex-shrink-0">{row.label}</span>
            <div className="flex-1 min-w-0">
              <div className="text-slate-300">{row.value}</div>
              {row.sub && <div className="text-slate-700 text-[9px] mt-0.5">{row.sub}</div>}
            </div>
            <ChevronRight size={10} className="text-slate-800 flex-shrink-0" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/15">
        <Zap size={10} className="text-emerald-500 flex-shrink-0" />
        <span className="text-[10px] font-mono text-emerald-600">Ready to launch an isolated runtime session.</span>
      </div>
    </div>
  )
}

interface LaunchStepState {
  id: string
  label: string
  detail: string
  status: LaunchStepStatus
}

function LaunchSequence({ config, onDone, onRetry }: { config: SessionLaunchConfig; onDone: () => void; onRetry: () => void }) {
  const { lastWorktreeError, clearWorktreeError } = useRuntime()
  const [steps, setSteps] = useState<LaunchStepState[]>(
    LAUNCH_SEQUENCE.map(s => ({ id: s.id, label: s.label, detail: s.getDetail(config), status: 'pending' }))
  )
  const [live, setLive] = useState(false)
  const [failed, setFailed] = useState(false)

  // Watch for real worktree errors from the engine
  useEffect(() => {
    if (lastWorktreeError && !live && !failed) {
      setFailed(true)
      setSteps(prev => prev.map(s =>
        s.status === 'running' ? { ...s, status: 'error', detail: lastWorktreeError }
        : s.status === 'pending' ? { ...s, status: 'pending' }
        : s
      ))
    }
  }, [lastWorktreeError, live, failed])

  useEffect(() => {
    if (failed) return
    const timers: ReturnType<typeof setTimeout>[] = []

    LAUNCH_SEQUENCE.forEach((step, idx) => {
      timers.push(setTimeout(() => {
        setSteps(prev => {
          if (prev.some(s => s.status === 'error')) return prev
          return prev.map((s, i) => i === idx ? { ...s, status: 'running' } : s)
        })
      }, step.delay))

      timers.push(setTimeout(() => {
        setSteps(prev => {
          if (prev.some(s => s.status === 'error')) return prev
          return prev.map((s, i) => i === idx ? { ...s, status: 'done' } : s)
        })
      }, step.delay + step.duration))
    })

    const totalDuration = LAUNCH_SEQUENCE.reduce((max, s) => Math.max(max, s.delay + s.duration), 0)
    timers.push(setTimeout(() => {
      setSteps(prev => {
        if (prev.some(s => s.status === 'error')) return prev
        setLive(true)
        return prev
      })
    }, totalDuration + 200))

    return () => timers.forEach(clearTimeout)
  }, [failed])

  const handleRetry = () => {
    clearWorktreeError()
    onRetry()
  }

  return (
    <div className="flex flex-col items-center justify-center h-full py-8 gap-6">
      <div className="w-full max-w-sm space-y-2">
        {steps.map((step, i) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: step.status === 'pending' ? 0.3 : 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
            className="flex items-start gap-3"
          >
            <div className="flex-shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center">
              {step.status === 'done'    && <CheckCircle2 size={14} className="text-emerald-400" />}
              {step.status === 'running' && <Loader2 size={14} className="text-cyan-400 animate-spin" />}
              {step.status === 'pending' && <Circle size={14} className="text-slate-800" />}
              {step.status === 'error'   && <XCircle size={14} className="text-crimson-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className={cn(
                'text-[11px] font-mono transition-colors',
                step.status === 'done'    ? 'text-slate-400'
                : step.status === 'running' ? 'text-cyan-300'
                : step.status === 'error'   ? 'text-crimson-400'
                : 'text-slate-700',
              )}>
                {step.label}
              </div>
              {(step.status === 'done' || step.status === 'running' || step.status === 'error') && (
                <div className={cn(
                  'text-[9px] font-mono mt-0.5',
                  step.status === 'error' ? 'text-crimson-500/70' : 'text-slate-700',
                )}>
                  {step.detail}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {failed && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-crimson-500/10 border border-crimson-500/25">
              <AlertTriangle size={11} className="text-crimson-400" />
              <span className="text-[11px] font-mono text-crimson-400">Session launch failed</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRetry}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[11px] font-mono bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:bg-white/[0.07] transition-all"
              >
                Try again
              </button>
              <button
                onClick={onDone}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[11px] font-mono text-slate-600 hover:text-slate-400 transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}

        {live && !failed && (
          <motion.div
            key="live"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex flex-col items-center gap-4"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/25">
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-[11px] font-mono text-emerald-400">Session live</span>
            </div>
            <button
              onClick={onDone}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-[12px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 hover:border-cyan-500/40 hover:bg-cyan-500/15 transition-all"
            >
              <Sparkles size={12} />
              Open session
              <ArrowRight size={11} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface SpawnSessionModalProps {
  onClose: () => void
  initialWorkspace?: string
}

export function SpawnSessionModal({ onClose, initialWorkspace }: SpawnSessionModalProps) {
  const { spawnSession } = useRuntime()
  const [step, setStep] = useState<WizardStep>('workspace')

  const preselected = initialWorkspace
    ? mockWorkspaces.find(w => w.id === initialWorkspace) ?? null
    : null

  const [workspace, setWorkspace] = useState<Workspace | null>(preselected)
  const [agent,     setAgent]     = useState<Agent | null>(null)
  const [branch,    setBranch]    = useState('')
  const [providerId, setProviderId] = useState('anthropic')
  const [modelId,    setModelId]    = useState('claude-sonnet-4-6')

  useEffect(() => {
    if (preselected) setStep('agent')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const canAdvance = useCallback(() => {
    switch (step) {
      case 'workspace': return workspace !== null
      case 'agent':     return agent !== null
      case 'branch':    return branch.trim().length > 3
      case 'config':    return true
      case 'summary':   return true
      default:          return false
    }
  }, [step, workspace, agent, branch])

  const stepOrder = WIZARD_STEPS.map(s => s.id)

  const advance = () => {
    const idx = stepOrder.indexOf(step)
    if (idx < stepOrder.length - 1) {
      setStep(stepOrder[idx + 1])
    } else {
      handleLaunch()
    }
  }

  const back = () => {
    const idx = stepOrder.indexOf(step)
    if (idx > 0) setStep(stepOrder[idx - 1])
  }

  const handleLaunch = () => {
    if (!workspace || !agent) return
    const providerName = PROVIDER_OPTIONS.find(p => p.id === providerId)?.name ?? providerId
    const config: SessionLaunchConfig = {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      rootPath: workspace.rootPath,
      branchName: branch,
      agentId: agent.id,
      agentName: agent.name,
      providerId,
      providerName,
      modelId,
    }
    setStep('launch')
    setTimeout(() => spawnSession(config), 100)
  }

  const isLaunchStep = step === 'launch'

  const config: SessionLaunchConfig = {
    workspaceId: workspace?.id ?? '',
    workspaceName: workspace?.name ?? '',
    rootPath: workspace?.rootPath ?? '',
    branchName: branch,
    agentId: agent?.id ?? '',
    agentName: agent?.name ?? '',
    providerId,
    providerName: PROVIDER_OPTIONS.find(p => p.id === providerId)?.name ?? providerId,
    modelId,
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={cn(
            'glass-strong rounded-2xl border border-white/[0.08] shadow-[0_32px_80px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden',
            isLaunchStep ? 'w-[480px] h-[440px]' : 'w-[620px]',
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
            <div className="flex items-center gap-2">
              <Cpu size={13} className="text-slate-600" />
              <span className="text-[13px] font-semibold text-slate-200">
                {isLaunchStep ? 'Launching Session' : 'Spawn Session'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.05] transition-all"
            >
              <X size={12} />
            </button>
          </div>

          {/* Body */}
          {isLaunchStep ? (
            <LaunchSequence
              config={config}
              onDone={onClose}
              onRetry={() => setStep('summary')}
            />
          ) : (
            <div className="flex flex-1 overflow-hidden">
              {/* Step nav */}
              <div className="border-r border-white/[0.05] p-4 flex-shrink-0">
                <StepNav current={step} steps={WIZARD_STEPS} />
              </div>

              {/* Step content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.15 }}
                    >
                      {step === 'workspace' && (
                        <WorkspaceStep selected={workspace} onSelect={ws => { setWorkspace(ws); setTimeout(() => setStep('agent'), 150) }} />
                      )}
                      {step === 'agent' && (
                        <AgentStep selected={agent} onSelect={a => { setAgent(a); setTimeout(() => setStep('branch'), 150) }} />
                      )}
                      {step === 'branch' && (
                        <BranchStep value={branch} onChange={setBranch} />
                      )}
                      {step === 'config' && (
                        <ConfigStep
                          providerId={providerId}
                          modelId={modelId}
                          onChange={(pid, mid) => { setProviderId(pid); setModelId(mid) }}
                        />
                      )}
                      {step === 'summary' && (
                        <SummaryStep config={config} />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="px-5 py-3.5 border-t border-white/[0.05] flex items-center justify-between flex-shrink-0">
                  <button
                    onClick={back}
                    disabled={step === 'workspace'}
                    className="text-[11px] font-mono text-slate-600 hover:text-slate-400 disabled:opacity-30 transition-colors"
                  >
                    ← Back
                  </button>

                  <div className="flex items-center gap-3">
                    {/* Step dots */}
                    <div className="flex items-center gap-1">
                      {WIZARD_STEPS.map((s, i) => {
                        const idx = WIZARD_STEPS.findIndex(ws => ws.id === step)
                        return (
                          <div key={s.id} className={cn(
                            'w-1 h-1 rounded-full transition-all',
                            i < idx ? 'bg-emerald-500/60' : i === idx ? 'bg-cyan-400 w-2' : 'bg-white/[0.10]',
                          )} />
                        )
                      })}
                    </div>

                    <button
                      onClick={advance}
                      disabled={!canAdvance()}
                      className={cn(
                        'flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-mono border transition-all disabled:opacity-40',
                        step === 'summary'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:border-emerald-500/40'
                          : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:border-cyan-500/35',
                      )}
                    >
                      {step === 'summary' ? (
                        <><Zap size={10} /> Launch</>
                      ) : (
                        <>Next <ChevronRight size={10} /></>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
