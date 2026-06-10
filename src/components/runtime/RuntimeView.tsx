import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cpu, Globe, ScrollText, Monitor, RadioTower } from 'lucide-react'
import { cn } from '../../lib/utils'
import { RuntimeConnectionPanel } from './RuntimeConnectionPanel'
import { ProviderDiagnosticsPanel } from './ProviderDiagnosticsPanel'
import { RuntimeLogPanel } from './RuntimeLogPanel'
import { useRuntime } from '../../context/RuntimeContext'
import { getEnvironment } from '../../runtime/desktop/desktopBridge'
import type { StoreInitResult, StoreStatus } from '../../runtime/store'
import { StorageDiagnosticsPanel } from './StorageDiagnosticsPanel'

type RuntimeTab = 'connection' | 'providers' | 'logs'

const tabs: { id: RuntimeTab; label: string; icon: React.ReactNode }[] = [
  { id: 'connection', label: 'Connection',  icon: <Cpu size={11} /> },
  { id: 'providers',  label: 'Providers',   icon: <Globe size={11} /> },
  { id: 'logs',       label: 'Logs',        icon: <ScrollText size={11} /> },
]

function EnvironmentBanner() {
  const env = getEnvironment()
  const isDesktop = env === 'tauri'

  return (
    <div className={cn(
      'flex items-center gap-2 px-4 py-2 border-b text-[10px] font-mono',
      isDesktop
        ? 'border-cyan-500/15 bg-cyan-500/5 text-cyan-600'
        : 'border-amber-500/15 bg-amber-500/5 text-amber-600/70',
    )}>
      {isDesktop
        ? <Monitor size={9} className="flex-shrink-0" />
        : <RadioTower size={9} className="flex-shrink-0" />
      }
      <span>
        {isDesktop
          ? 'Desktop mode — filesystem and provider detection are real'
          : 'Browser preview — runtime and filesystem interactions are simulated'
        }
      </span>
    </div>
  )
}

interface RuntimeViewProps {
  persistenceInit?: StoreInitResult | null
  persistenceStatus?: StoreStatus | null
}

export function RuntimeView({ persistenceInit, persistenceStatus }: RuntimeViewProps) {
  const [activeTab, setActiveTab] = useState<RuntimeTab>('connection')
  const { runtimeLogs, providerHealth } = useRuntime()

  const warnLogs = runtimeLogs.filter(l => l.level === 'warn' || l.level === 'error').length
  const offlineProviders = Object.values(providerHealth).filter(
    p => p.state === 'unreachable' || p.state === 'degraded',
  ).length

  return (
    <div className="flex flex-col h-full">
      <EnvironmentBanner />
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-4 pt-4 pb-0 flex-shrink-0 border-b border-white/[0.04]">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id
          const badge = tab.id === 'logs' && warnLogs > 0
            ? warnLogs
            : tab.id === 'providers' && offlineProviders > 0
            ? offlineProviders
            : null

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-2 text-[11px] font-mono transition-all rounded-t-lg',
                isActive ? 'text-slate-200' : 'text-slate-600 hover:text-slate-400',
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="runtime-tab-bg"
                  className="absolute inset-0 bg-white/[0.05] rounded-t-lg border-t border-x border-white/[0.06]"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }}
                />
              )}
              <span className="relative z-10">{tab.icon}</span>
              <span className="relative z-10">{tab.label}</span>
              {badge !== null && (
                <span className="relative z-10 text-[8px] font-mono px-1 rounded-full bg-amber-500/20 text-amber-500 min-w-[14px] text-center">
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Panel */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {activeTab === 'connection' && (
              <div className="flex flex-col h-full overflow-auto">
                <StorageDiagnosticsPanel
                  init={persistenceInit ?? null}
                  status={persistenceStatus ?? null}
                />
                <RuntimeConnectionPanel />
              </div>
            )}
            {activeTab === 'providers'  && <ProviderDiagnosticsPanel />}
            {activeTab === 'logs'       && <RuntimeLogPanel />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
