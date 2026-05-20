import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cpu, Wifi, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, Activity, Box, Zap, TerminalSquare, Globe,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useRuntime } from '../../context/RuntimeContext'
import { runtimeConnection } from '../../runtime/runtimeConnection'
import type { ConnectionDiagnostics } from '../../runtime/runtimeConnection'

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

function StatusRow({
  label,
  ok,
  detail,
  loading,
}: {
  label: string
  ok: boolean | null
  detail?: string
  loading?: boolean
}) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <div className="flex-shrink-0 w-3.5">
        {loading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw size={10} className="text-slate-600" />
          </motion.div>
        ) : ok === null ? (
          <div className="w-1.5 h-1.5 rounded-full bg-slate-700 ml-1" />
        ) : ok ? (
          <CheckCircle2 size={11} className="text-emerald-500" />
        ) : (
          <XCircle size={11} className="text-crimson-500" />
        )}
      </div>
      <span className="text-[11px] font-mono text-slate-500 flex-1">{label}</span>
      {detail && (
        <span className="text-[10px] font-mono text-slate-700">{detail}</span>
      )}
    </div>
  )
}

function MetricBar({ label, value, max, unit, color }: {
  label: string; value: number; max: number; unit: string; color: string
}) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-mono text-slate-600">{label}</span>
        <span className="text-[10px] font-mono text-slate-500">
          {typeof value === 'number' ? value.toFixed(value < 10 ? 1 : 0) : value}{unit}
        </span>
      </div>
      <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', color)}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

export function RuntimeConnectionPanel() {
  const { daemonState, connectionStatus, restartDaemon, simulateEscalation } = useRuntime()
  const [diagnostics, setDiagnostics] = useState<ConnectionDiagnostics>(runtimeConnection.getDiagnostics())
  const [restarting, setRestarting] = useState(false)

  useEffect(() => {
    return runtimeConnection.subscribe(setDiagnostics)
  }, [])

  const handleRestart = () => {
    setRestarting(true)
    restartDaemon()
    setTimeout(() => setRestarting(false), 2500)
  }

  const isConnected = daemonState?.status === 'connected'
  const isReconnecting = daemonState?.status === 'reconnecting' || connectionStatus === 'connecting'

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="p-5 space-y-5 max-w-2xl">

        {/* Daemon status header */}
        <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu size={12} className="text-slate-600" />
              <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Runtime Daemon</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono border',
                isReconnecting
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                  : isConnected
                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
                  : 'border-crimson-500/25 bg-crimson-500/10 text-crimson-400',
              )}>
                <motion.div
                  className={cn(
                    'w-1 h-1 rounded-full',
                    isReconnecting ? 'bg-amber-400' : isConnected ? 'bg-emerald-400' : 'bg-crimson-400',
                  )}
                  animate={isConnected || isReconnecting ? { opacity: [1, 0.4, 1] } : {}}
                  transition={{ duration: 1.8, repeat: Infinity }}
                />
                {isReconnecting ? 'reconnecting' : isConnected ? 'connected' : 'stopped'}
              </div>
            </div>
          </div>

          <div className="px-4 py-3 grid grid-cols-3 gap-4">
            <div>
              <div className="text-[9px] font-mono text-slate-700 mb-1">Version</div>
              <div className="text-[11px] font-mono text-slate-400">{daemonState?.version ?? '—'}</div>
            </div>
            <div>
              <div className="text-[9px] font-mono text-slate-700 mb-1">Uptime</div>
              <div className="text-[11px] font-mono text-slate-400">
                {daemonState ? formatUptime(daemonState.uptimeSeconds) : '—'}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-mono text-slate-700 mb-1">Events/s</div>
              <div className="text-[11px] font-mono text-cyan-500">
                {daemonState?.eventThroughput.toFixed(1) ?? '—'}
              </div>
            </div>
          </div>

          {/* Resource meters */}
          {daemonState && (
            <div className="px-4 pb-4 space-y-2.5">
              <MetricBar
                label="Memory"
                value={daemonState.memoryMb}
                max={512}
                unit=" MB"
                color="bg-cyan-500/50"
              />
              <MetricBar
                label="CPU"
                value={daemonState.cpuPercent}
                max={100}
                unit="%"
                color="bg-violet-500/50"
              />
            </div>
          )}
        </div>

        {/* System surface status */}
        <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <Activity size={11} className="text-slate-600" />
              <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">System Surfaces</span>
            </div>
          </div>
          <div className="px-4 py-2 divide-y divide-white/[0.03]">
            <StatusRow
              label="Local filesystem"
              ok={daemonState?.filesystemMounted ?? null}
              detail={daemonState?.filesystemMounted ? 'mounted' : undefined}
              loading={!daemonState}
            />
            <StatusRow
              label="Sandbox environment"
              ok={daemonState?.sandboxStatus === 'healthy' ? true : daemonState?.sandboxStatus === 'unavailable' ? false : null}
              detail={daemonState?.sandboxStatus}
              loading={!daemonState}
            />
            <StatusRow
              label="Docker runtime"
              ok={daemonState?.dockerAvailable ?? null}
              detail={daemonState?.dockerAvailable ? 'available' : 'unavailable'}
              loading={!daemonState}
            />
            <StatusRow
              label="Ollama (local LLM)"
              ok={daemonState?.ollamaDetected ?? null}
              detail={daemonState?.ollamaDetected ? 'detected' : 'not found'}
              loading={!daemonState}
            />
          </div>
        </div>

        {/* Provider connections */}
        <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <Globe size={11} className="text-slate-600" />
              <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Provider Connections</span>
            </div>
          </div>
          <div className="px-4 py-2 divide-y divide-white/[0.03]">
            {daemonState ? Object.entries(daemonState.providerStatuses).map(([provider, status]) => (
              <StatusRow
                key={provider}
                label={provider.charAt(0).toUpperCase() + provider.slice(1)}
                ok={status === 'connected' ? true : status === 'disconnected' ? false : null}
                detail={status}
                loading={status === 'connecting'}
              />
            )) : (
              <StatusRow label="Loading providers..." ok={null} loading />
            )}
          </div>
        </div>

        {/* IPC diagnostics */}
        <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <Wifi size={11} className="text-slate-600" />
              <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">IPC Connection</span>
            </div>
          </div>
          <div className="px-4 py-3 grid grid-cols-3 gap-4">
            <div>
              <div className="text-[9px] font-mono text-slate-700 mb-1">Latency</div>
              <div className="text-[11px] font-mono text-slate-400">{diagnostics.latencyMs}ms</div>
            </div>
            <div>
              <div className="text-[9px] font-mono text-slate-700 mb-1">Quality</div>
              <div className={cn(
                'text-[11px] font-mono',
                diagnostics.quality === 'excellent' ? 'text-emerald-400' :
                diagnostics.quality === 'good' ? 'text-cyan-400' :
                diagnostics.quality === 'degraded' ? 'text-amber-400' : 'text-crimson-400',
              )}>{diagnostics.quality}</div>
            </div>
            <div>
              <div className="text-[9px] font-mono text-slate-700 mb-1">Drop rate</div>
              <div className="text-[11px] font-mono text-slate-400">{(diagnostics.dropRate * 100).toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* Debug actions */}
        <div className="glass rounded-2xl border border-white/[0.06] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <TerminalSquare size={11} className="text-slate-600" />
              <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Runtime Controls</span>
            </div>
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-2">
            <button
              onClick={handleRestart}
              disabled={restarting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-500 hover:text-slate-300 border border-white/[0.07] hover:border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.05] transition-all disabled:opacity-40"
            >
              <RefreshCw size={9} className={restarting ? 'animate-spin' : ''} />
              {restarting ? 'Restarting...' : 'Restart daemon'}
            </button>
            <button
              onClick={simulateEscalation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono text-amber-600 hover:text-amber-400 border border-amber-500/20 hover:border-amber-500/35 bg-amber-500/5 hover:bg-amber-500/10 transition-all"
            >
              <AlertTriangle size={9} />
              Simulate escalation
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-500 hover:text-slate-300 border border-white/[0.07] hover:border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.05] transition-all"
            >
              <Box size={9} />
              Clear runtime cache
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-500 hover:text-slate-300 border border-white/[0.07] hover:border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.05] transition-all"
            >
              <Zap size={9} />
              Run diagnostics
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

// Compact widget for embedding in sidebars
export function DaemonStatusWidget() {
  const { daemonState, connectionStatus } = useRuntime()
  const isConnected = daemonState?.status === 'connected'
  const isConnecting = !daemonState || connectionStatus === 'connecting'

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={daemonState?.status ?? 'loading'}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-1.5"
      >
        <motion.div
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            isConnecting ? 'bg-amber-400' : isConnected ? 'bg-emerald-400' : 'bg-crimson-400',
          )}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <span className={cn(
          'text-[9px] font-mono',
          isConnecting ? 'text-amber-600' : isConnected ? 'text-emerald-600' : 'text-crimson-600',
        )}>
          {isConnecting ? 'connecting' : daemonState?.status ?? 'unknown'}
        </span>
        {daemonState && (
          <span className="text-[9px] font-mono text-slate-700">
            {formatUptime(daemonState.uptimeSeconds)}
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
