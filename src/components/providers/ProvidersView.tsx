import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, CheckCircle, XCircle, Settings, RefreshCw } from 'lucide-react'
import { GlassPanel } from '../shared/GlassPanel'
import { StatusPill } from '../shared/StatusPill'
import { GlowButton } from '../shared/GlowButton'
import { mockProviders } from '../../data/mockProviders'

const providerLogos: Record<string, string> = {
  anthropic: '◆',
  openai: '⬡',
  ollama: '🦙',
  groq: '⚡',
  openrouter: '⇌',
  lmstudio: '🔬',
  vllm: '▣',
  fireworks: '🔥',
}

export function ProvidersView() {
  const [testing, setTesting] = useState<string | null>(null)

  const handleTestConnection = (id: string) => {
    setTesting(id)
    setTimeout(() => setTesting(null), 2000)
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-base font-semibold text-white">Providers</h1>
          <p className="text-xs text-slate-500 mt-0.5">LLM provider connections. Plug in any OpenAI-compatible endpoint.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {mockProviders.map((provider, i) => (
          <motion.div
            key={provider.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassPanel className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-lg flex-shrink-0">
                    {providerLogos[provider.id] ?? '⚙'}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{provider.name}</div>
                    <code className="text-[10px] text-slate-600 font-mono">{provider.baseUrl}</code>
                  </div>
                </div>
                <StatusPill status={provider.status} size="md" />
              </div>

              {/* Stats */}
              {provider.status === 'connected' && (
                <div className="grid grid-cols-3 gap-3 mb-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <div className="text-center">
                    <div className="text-xs font-mono font-semibold text-slate-200">{provider.latencyMs}ms</div>
                    <div className="text-[9px] text-slate-600 mt-0.5">latency</div>
                  </div>
                  <div className="text-center border-x border-white/[0.06]">
                    <div className="text-xs font-mono font-semibold text-slate-200">{provider.requestsToday}</div>
                    <div className="text-[9px] text-slate-600 mt-0.5">req today</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-mono font-semibold text-emerald-400">${provider.costToday?.toFixed(2)}</div>
                    <div className="text-[9px] text-slate-600 mt-0.5">cost today</div>
                  </div>
                </div>
              )}

              {/* Default model */}
              <div className="mb-3">
                <div className="text-[9px] text-slate-600 font-mono uppercase tracking-wider mb-1.5">Default Model</div>
                <code className="text-[11px] text-slate-300 font-mono bg-white/[0.04] px-2 py-1 rounded-lg">
                  {provider.defaultModel}
                </code>
              </div>

              {/* Available models */}
              {provider.models.length > 0 && (
                <div className="mb-4">
                  <div className="text-[9px] text-slate-600 font-mono uppercase tracking-wider mb-1.5">
                    Available Models ({provider.models.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {provider.models.slice(0, 3).map(m => (
                      <span key={m} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-500 border border-white/[0.05] truncate max-w-[140px]">
                        {m.split('/').slice(-1)[0]}
                      </span>
                    ))}
                    {provider.models.length > 3 && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-600">
                        +{provider.models.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* API key status */}
              <div className="flex items-center gap-2 mb-4">
                {provider.apiKeySet ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                    <CheckCircle size={11} />
                    <span>API key configured</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                    <XCircle size={11} />
                    <span>No API key</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
                <GlowButton
                  variant="secondary"
                  size="sm"
                  icon={testing === provider.id ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                  onClick={() => handleTestConnection(provider.id)}
                  disabled={provider.status === 'unconfigured'}
                >
                  {testing === provider.id ? 'Testing...' : 'Test'}
                </GlowButton>
                <GlowButton variant="ghost" size="sm" icon={<Settings size={12} />}>
                  Configure
                </GlowButton>
              </div>
            </GlassPanel>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
