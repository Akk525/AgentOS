import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Wifi, Globe, ChevronDown, Zap,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useRuntime } from '../../context/RuntimeContext'
import type { ProviderHealth, ProviderConnectionState } from '../../types'

const stateConfig: Record<ProviderConnectionState, { color: string; dot: string; label: string; icon: React.ReactNode }> = {
  connected:    { color: 'text-emerald-400', dot: 'bg-emerald-400', label: 'Connected',    icon: <CheckCircle2 size={11} /> },
  connecting:   { color: 'text-amber-400',   dot: 'bg-amber-400',   label: 'Connecting…',  icon: <RefreshCw size={11} /> },
  unreachable:  { color: 'text-crimson-400', dot: 'bg-crimson-500', label: 'Unreachable',  icon: <XCircle size={11} /> },
  unauthorized: { color: 'text-crimson-400', dot: 'bg-crimson-400', label: 'Unauthorised', icon: <AlertTriangle size={11} /> },
  latency_high: { color: 'text-amber-400',   dot: 'bg-amber-400',   label: 'Latency high', icon: <AlertTriangle size={11} /> },
  degraded:     { color: 'text-amber-500',   dot: 'bg-amber-500',   label: 'Degraded',     icon: <AlertTriangle size={11} /> },
  unconfigured: { color: 'text-slate-600',   dot: 'bg-slate-700',   label: 'Not configured', icon: <XCircle size={11} /> },
}

const PROVIDER_LOGOS: Record<string, string> = {
  ollama:    '🦙',
  anthropic: '◆',
  openai:    '⬡',
  vllm:      '▣',
  groq:      '⚡',
}

function ProviderCard({ health, onPing }: { health: ProviderHealth; onPing: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [pinging, setPinging] = useState(false)
  const cfg = stateConfig[health.state]

  const handlePing = () => {
    setPinging(true)
    onPing()
    setTimeout(() => setPinging(false), 3500)
  }

  return (
    <div className="glass rounded-xl border border-white/[0.06] overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Logo + name */}
        <span className="text-lg flex-shrink-0 leading-none">
          {PROVIDER_LOGOS[health.providerId] ?? '⚙'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-slate-300">{health.name}</span>
            <div className={cn('flex items-center gap-1', cfg.color)}>
              <motion.div
                animate={health.state === 'connected' || health.state === 'connecting'
                  ? { opacity: [1, 0.4, 1] }
                  : {}}
                transition={{ duration: 1.8, repeat: Infinity }}
                className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)}
              />
              <span className="text-[9px] font-mono">{cfg.label}</span>
            </div>
          </div>
          <div className="text-[9px] font-mono text-slate-700 truncate">{health.endpoint}</div>
        </div>

        {/* Latency */}
        {health.latencyMs !== null && (
          <div className="text-right flex-shrink-0">
            <div className={cn('text-[11px] font-mono tabular-nums', health.latencyMs > 800 ? 'text-amber-400' : 'text-slate-400')}>
              {health.latencyMs}ms
            </div>
            <div className="text-[9px] font-mono text-slate-700">latency</div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handlePing}
            disabled={pinging}
            className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-mono border border-white/[0.07] text-slate-600 hover:text-slate-300 hover:border-white/[0.12] transition-all disabled:opacity-40"
          >
            <Zap size={8} className={pinging ? 'animate-pulse text-cyan-400' : ''} />
            {pinging ? 'Pinging…' : 'Ping'}
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1 text-slate-700 hover:text-slate-400 transition-colors"
          >
            <ChevronDown size={11} className={cn('transition-transform', expanded && 'rotate-180')} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 border-t border-white/[0.04] pt-2.5 space-y-2">
              <div className="flex items-center gap-4 text-[10px] font-mono">
                <div>
                  <span className="text-slate-700">API key </span>
                  <span className={health.apiKeyPresent ? 'text-emerald-500' : 'text-crimson-500'}>
                    {health.apiKeyPresent ? 'configured' : 'not set'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-700">Last ping </span>
                  <span className="text-slate-500">
                    {new Date(health.lastPingedAt).toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                </div>
              </div>

              {health.errorMessage && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-crimson-500/80">
                  <AlertTriangle size={9} />
                  {health.errorMessage}
                </div>
              )}

              {health.discoveredModels.length > 0 && (
                <div>
                  <div className="text-[9px] font-mono text-slate-700 uppercase tracking-widest mb-1">
                    Discovered models ({health.discoveredModels.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {health.discoveredModels.slice(0, 6).map(m => (
                      <span key={m} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.05] text-slate-500 truncate max-w-[160px]">
                        {m}
                      </span>
                    ))}
                    {health.discoveredModels.length > 6 && (
                      <span className="text-[9px] font-mono text-slate-700">
                        +{health.discoveredModels.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {health.state === 'unconfigured' && (
                <div className="text-[10px] font-mono text-slate-700">
                  Set <code className="text-slate-500">VITE_{health.providerId.toUpperCase()}_API_KEY</code> to connect.
                </div>
              )}

              {health.state === 'unreachable' && health.providerId === 'ollama' && (
                <div className="text-[10px] font-mono text-slate-600">
                  Start Ollama: <code className="text-slate-500">ollama serve</code>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function ProviderDiagnosticsPanel() {
  const { providerHealth, pingProvider, pingAllProviders } = useRuntime()
  const [scanning, setScanning] = useState(false)

  const providers = Object.values(providerHealth)

  const handleScanAll = () => {
    setScanning(true)
    pingAllProviders()
    setTimeout(() => setScanning(false), 5000)
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="p-5 space-y-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe size={12} className="text-slate-600" />
            <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Provider Connections</span>
          </div>
          <div className="flex items-center gap-2">
            {providers.length > 0 && (
              <span className="text-[9px] font-mono text-slate-700">
                {providers.filter(p => p.state === 'connected').length}/{providers.length} online
              </span>
            )}
            <button
              onClick={handleScanAll}
              disabled={scanning}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono border border-white/[0.07] text-slate-500 hover:text-slate-300 hover:border-white/[0.12] transition-all disabled:opacity-40"
            >
              <RefreshCw size={9} className={scanning ? 'animate-spin' : ''} />
              {scanning ? 'Scanning…' : 'Scan all'}
            </button>
          </div>
        </div>

        {/* Provider cards */}
        {providers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Wifi size={20} className="text-slate-800" />
            <p className="text-[11px] font-mono text-slate-700">Probing providers…</p>
            <p className="text-[10px] text-slate-800">Results appear after the first scan completes.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {providers.map(health => (
              <ProviderCard
                key={health.providerId}
                health={health}
                onPing={() => pingProvider(health.providerId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
