import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderGit2, X, ChevronRight, CheckCircle2,
  Cpu, RefreshCw, HardDrive, AlertTriangle, XCircle, GitBranch, FolderOpen,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useRuntime } from '../../context/RuntimeContext'
import { workspaceValidator } from '../../runtime/workspaceValidator'
import { getDesktopBridge, getEnvironment } from '../../runtime/desktop/desktopBridge'
import type { RepoValidationResult } from '../../types'

interface WorkspaceMountModalProps {
  onClose: () => void
}

type Step = 'repo' | 'options' | 'mounting'

const MOCK_RECENT_REPOS = [
  { name: 'boilerbyte',  path: '~/projects/boilerbyte',  provider: 'anthropic' },
  { name: 'clauseguard', path: '~/projects/clauseguard', provider: 'openai' },
  { name: 'formula-os',  path: '~/projects/formula-os',  provider: 'anthropic' },
  { name: 'new-project', path: '~/projects/new-project', provider: 'anthropic' },
]

const PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic',    glyph: '◆', model: 'claude-sonnet-4-6' },
  { id: 'openai',    label: 'OpenAI',       glyph: '⬡', model: 'gpt-4o' },
  { id: 'ollama',    label: 'Ollama (local)', glyph: '🦙', model: 'llama3.2' },
]

function ValidationBadge({ result }: { result: RepoValidationResult | null }) {
  if (!result || result.state === 'idle') return null

  const config = {
    checking:       { icon: <RefreshCw size={9} className="animate-spin" />, color: 'text-slate-500',  text: 'Checking…' },
    valid_git:      { icon: <CheckCircle2 size={9} />, color: 'text-emerald-400', text: 'Git repository detected' },
    no_git:         { icon: <AlertTriangle size={9} />, color: 'text-amber-400',   text: 'No .git directory found' },
    invalid_path:   { icon: <XCircle size={9} />,      color: 'text-crimson-400', text: result.message },
    already_mounted:{ icon: <AlertTriangle size={9} />, color: 'text-amber-400',   text: 'Already mounted' },
  }[result.state]

  return (
    <div className={cn('flex items-center gap-1.5 text-[10px] font-mono mt-1.5', config.color)}>
      {config.icon}
      <span>{config.text}</span>
      {result.state === 'valid_git' && result.branch && (
        <span className="flex items-center gap-1 ml-1 text-slate-600">
          <GitBranch size={8} />{result.branch}
          {result.isDirty && <span className="text-amber-600 ml-1">· dirty</span>}
        </span>
      )}
    </div>
  )
}

export function WorkspaceMountModal({ onClose }: WorkspaceMountModalProps) {
  const { mountWorkspace } = useRuntime()
  const [step, setStep] = useState<Step>('repo')
  const [selectedRepo, setSelectedRepo] = useState<typeof MOCK_RECENT_REPOS[0] | null>(null)
  const [customPath, setCustomPath] = useState('')
  const [validation, setValidation] = useState<RepoValidationResult | null>(null)
  const [validating, setValidating] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState('anthropic')
  const [createWorktree, setCreateWorktree] = useState(true)
  const [mountProgress, setMountProgress] = useState(0)
  const [mountDone, setMountDone] = useState(false)
  const [picking, setPicking] = useState(false)
  const validateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDesktop = getEnvironment() === 'tauri'

  const effectivePath = selectedRepo?.path ?? customPath

  // Validate path on change (debounced)
  useEffect(() => {
    if (!customPath || selectedRepo) {
      setValidation(null)
      return
    }

    const quick = workspaceValidator.quickCheck(customPath)
    setValidation(quick)

    if (quick.state === 'invalid_path') return

    if (validateTimeout.current) clearTimeout(validateTimeout.current)
    setValidating(true)
    validateTimeout.current = setTimeout(async () => {
      const result = await workspaceValidator.validate(customPath)
      setValidation(result)
      setValidating(false)
    }, 400)

    return () => { if (validateTimeout.current) clearTimeout(validateTimeout.current) }
  }, [customPath, selectedRepo])

  const canProceed = effectivePath && (
    selectedRepo !== null ||
    (validation?.state === 'valid_git' || validation?.state === 'no_git')
  ) && !validating

  const handleSelectRepo = (repo: typeof MOCK_RECENT_REPOS[0]) => {
    setSelectedRepo(repo)
    setCustomPath('')
    setValidation(null)
  }

  const handlePickFolder = async () => {
    setPicking(true)
    try {
      const bridge = await getDesktopBridge()
      const result = await bridge.pickDirectory()
      if (!result.cancelled && result.path) {
        setSelectedRepo(null)
        setCustomPath(result.path)
      }
    } finally {
      setPicking(false)
    }
  }

  const handleMount = () => {
    if (!effectivePath) return
    setStep('mounting')
    const steps = [33, 66, 100]
    steps.forEach((pct, i) => {
      setTimeout(() => setMountProgress(pct), (i + 1) * 700)
    })
    setTimeout(() => {
      setMountDone(true)
      mountWorkspace('ws-new', effectivePath)
    }, 2400)
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -8 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="fixed top-[18%] left-1/2 -translate-x-1/2 z-50 w-[480px] glass-strong rounded-2xl border border-white/[0.08] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FolderGit2 size={13} className="text-slate-500" />
            <span className="text-[13px] font-semibold text-slate-200">Mount workspace</span>
            {step !== 'mounting' && <StepIndicator current={step === 'repo' ? 1 : 2} total={2} />}
          </div>
          <button onClick={onClose} className="text-slate-700 hover:text-slate-400 transition-colors">
            <X size={13} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Select repo */}
          {step === 'repo' && (
            <motion.div
              key="repo"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.15 }}
              className="px-5 py-4"
            >
              <div className="text-[10px] font-mono text-slate-700 mb-3">Recent repositories</div>
              <div className="space-y-1 mb-4">
                {MOCK_RECENT_REPOS.map(repo => (
                  <button
                    key={repo.path}
                    onClick={() => handleSelectRepo(repo)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all',
                      selectedRepo?.path === repo.path
                        ? 'border-cyan-500/30 bg-cyan-500/8'
                        : 'border-white/[0.05] hover:border-white/[0.10] hover:bg-white/[0.03]',
                    )}
                  >
                    <FolderGit2 size={11} className={selectedRepo?.path === repo.path ? 'text-cyan-400' : 'text-slate-600'} />
                    <div className="flex-1 min-w-0">
                      <div className={cn('text-[11px] font-mono', selectedRepo?.path === repo.path ? 'text-slate-200' : 'text-slate-400')}>
                        {repo.name}
                      </div>
                      <div className="text-[10px] text-slate-700 font-mono truncate">{repo.path}</div>
                    </div>
                    {selectedRepo?.path === repo.path && (
                      <CheckCircle2 size={11} className="text-cyan-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-slate-700">Or enter a path manually</span>
                {isDesktop && (
                  <button
                    onClick={handlePickFolder}
                    disabled={picking}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-mono text-slate-500 hover:text-slate-300 border border-white/[0.06] hover:border-white/[0.12] transition-all disabled:opacity-40"
                  >
                    {picking
                      ? <RefreshCw size={8} className="animate-spin" />
                      : <FolderOpen size={8} />
                    }
                    {picking ? 'Opening…' : 'Pick folder'}
                  </button>
                )}
              </div>
              <input
                value={customPath}
                onChange={e => { setCustomPath(e.target.value); setSelectedRepo(null) }}
                placeholder="~/path/to/repo or /absolute/path"
                className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.07] text-[11px] font-mono text-slate-300 placeholder:text-slate-700 outline-none focus:border-cyan-500/30 transition-colors"
              />
              <ValidationBadge result={validation} />

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setStep('options')}
                  disabled={!canProceed}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/35 disabled:opacity-30 transition-all"
                >
                  Configure options
                  <ChevronRight size={10} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Options */}
          {step === 'options' && (
            <motion.div
              key="options"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.15 }}
              className="px-5 py-4"
            >
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] mb-4">
                <HardDrive size={10} className="text-slate-600" />
                <span className="text-[11px] font-mono text-slate-500 truncate">{effectivePath}</span>
                {validation?.state === 'valid_git' && (
                  <CheckCircle2 size={9} className="text-emerald-500 flex-shrink-0 ml-auto" />
                )}
              </div>

              <div className="text-[10px] font-mono text-slate-700 mb-2">Attach provider</div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProvider(p.id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border text-center transition-all',
                      selectedProvider === p.id
                        ? 'border-cyan-500/30 bg-cyan-500/8'
                        : 'border-white/[0.05] hover:border-white/[0.10] hover:bg-white/[0.03]',
                    )}
                  >
                    <span className="text-base leading-none">{p.glyph}</span>
                    <span className={cn('text-[9px] font-mono', selectedProvider === p.id ? 'text-slate-200' : 'text-slate-600')}>
                      {p.label}
                    </span>
                    <span className="text-[8px] font-mono text-slate-700 truncate w-full">{p.model}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-2 mb-4">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <button
                    onClick={() => setCreateWorktree(!createWorktree)}
                    className={cn(
                      'w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-all',
                      createWorktree ? 'border-cyan-500/50 bg-cyan-500/20' : 'border-white/[0.10]',
                    )}
                  >
                    {createWorktree && <CheckCircle2 size={9} className="text-cyan-400" />}
                  </button>
                  <span className="text-[11px] font-mono text-slate-500 group-hover:text-slate-400 transition-colors">
                    Create default worktree on mount
                  </span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <div className="w-3.5 h-3.5 rounded border border-white/[0.10] flex-shrink-0" />
                  <span className="text-[11px] font-mono text-slate-600">
                    Run git fetch on attach
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-2 justify-between">
                <button
                  onClick={() => setStep('repo')}
                  className="text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleMount}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/35 transition-all"
                >
                  <Cpu size={10} />
                  Mount workspace
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Mounting */}
          {step === 'mounting' && (
            <motion.div
              key="mounting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-5 py-8 flex flex-col items-center gap-5"
            >
              {!mountDone ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}>
                    <RefreshCw size={22} className="text-cyan-500/60" />
                  </motion.div>
                  <div className="text-center">
                    <div className="text-[12px] font-mono text-slate-400 mb-1">Mounting workspace</div>
                    <div className="text-[10px] font-mono text-slate-700 truncate max-w-xs">{effectivePath}</div>
                  </div>
                  <div className="w-full max-w-xs">
                    <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-cyan-500/50 rounded-full"
                        animate={{ width: `${mountProgress}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      {['Filesystem', 'Terminal', 'Runtime'].map((label, i) => (
                        <span key={label} className={cn(
                          'text-[9px] font-mono transition-colors',
                          mountProgress >= (i + 1) * 33 ? 'text-cyan-600' : 'text-slate-700',
                        )}>
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle2 size={24} className="text-emerald-400" />
                  <div className="text-center">
                    <div className="text-[12px] font-mono text-slate-300 mb-1">Workspace mounted</div>
                    <div className="text-[10px] font-mono text-slate-600">{effectivePath}</div>
                  </div>
                  <div className="space-y-1 w-full max-w-xs">
                    {['Filesystem mounted', 'Terminal available', 'Runtime attached'].map(label => (
                      <div key={label} className="flex items-center gap-2 text-[10px] font-mono text-emerald-600">
                        <CheckCircle2 size={9} />{label}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-[11px] font-mono bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:bg-white/[0.07] transition-all"
                  >
                    Done
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  )
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1 ml-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-1 rounded-full transition-all',
            i + 1 === current ? 'w-3 bg-cyan-500' : i + 1 < current ? 'w-1.5 bg-cyan-600/40' : 'w-1.5 bg-white/[0.08]',
          )}
        />
      ))}
    </div>
  )
}
