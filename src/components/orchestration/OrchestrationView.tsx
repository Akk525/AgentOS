import { useState } from 'react'
import { motion } from 'framer-motion'
import { Network, Layers, ListOrdered, Shield, Activity, GitBranch, Brain } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useOrchestrator } from '../../context/OrchestratorContext'
import { RuntimeGraph } from './RuntimeGraph'
import { SessionCluster } from './SessionCluster'
import { RuntimeQueuePanel } from './RuntimeQueuePanel'
import { ReviewSessionPanel } from './ReviewSessionPanel'
import { OrchestratorTimeline } from './OrchestratorTimeline'
import { RuntimePlanView } from './RuntimePlanView'
import { RuntimeReasoningPanel } from './RuntimeReasoningPanel'
import { useReplay } from '../../hooks/useReplay'
import { useTaskGraph } from '../../context/TaskGraphContext'
import { GlowButton } from '../shared/GlowButton'
import { Play } from 'lucide-react'

type OrchestratorTab = 'plan' | 'graph' | 'sessions' | 'queue' | 'reviews' | 'reasoning' | 'timeline'

const TABS: { id: OrchestratorTab; label: string; icon: React.ReactNode }[] = [
  { id: 'plan',      label: 'Plan',      icon: <GitBranch size={13} />   },
  { id: 'graph',     label: 'Graph',     icon: <Network size={13} />     },
  { id: 'sessions',  label: 'Sessions',  icon: <Layers size={13} />      },
  { id: 'queue',     label: 'Queue',     icon: <ListOrdered size={13} /> },
  { id: 'reviews',   label: 'Reviews',   icon: <Shield size={13} />      },
  { id: 'reasoning', label: 'Reasoning', icon: <Brain size={13} />       },
  { id: 'timeline',  label: 'Timeline',  icon: <Activity size={13} />    },
]

export function OrchestrationView() {
  const [tab, setTab] = useState<OrchestratorTab>('plan')
  const { blockers, reasoning } = useOrchestrator()
  const { enterReplay } = useReplay()
  const { activeProject, nodes } = useTaskGraph()

  const activeBlockers = blockers.filter(b => !b.resolved).length
  const criticalReasoning = reasoning.filter(r => r.severity === 'critical').length

  const badgeFor = (id: OrchestratorTab): number | undefined => {
    if (id === 'plan' && activeBlockers > 0) return activeBlockers
    if (id === 'reasoning' && criticalReasoning > 0) return criticalReasoning
    return undefined
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 py-2.5 border-b border-white/[0.05] flex-shrink-0 overflow-x-auto scrollbar-none">
        <div className="text-[9px] font-mono text-slate-800 uppercase tracking-widest mr-3 flex-shrink-0">
          v1.0
        </div>
        {TABS.map(t => {
          const badge = badgeFor(t.id)
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all flex-shrink-0',
                tab === t.id
                  ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                  : 'text-slate-600 hover:text-slate-400 hover:bg-white/[0.04]'
              )}
            >
              <span className={tab === t.id ? 'text-violet-400' : 'text-slate-700'}>{t.icon}</span>
              {t.label}
              {badge !== undefined && (
                <span className="absolute -top-1 -right-1 text-[7px] font-mono min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-amber-500 text-black font-bold">
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Panel */}
      <div className="flex-1 overflow-hidden">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="h-full"
        >
          {tab === 'plan'      && <RuntimePlanView />}
          {tab === 'graph'     && <RuntimeGraph />}
          {tab === 'sessions'  && <SessionCluster />}
          {tab === 'queue'     && <RuntimeQueuePanel />}
          {tab === 'reviews'   && <ReviewSessionPanel />}
          {tab === 'reasoning' && <RuntimeReasoningPanel />}
          {tab === 'timeline' && (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.05] flex-shrink-0">
                <span className="text-[10px] font-mono text-slate-600">Project event timeline</span>
                {activeProject && (
                  <GlowButton
                    variant="secondary"
                    size="sm"
                    icon={<Play size={11} />}
                    onClick={() => {
                      const epic = nodes.find(n => n.type === 'epic')
                      void enterReplay(epic ? { epicId: epic.id } : {})
                    }}
                  >
                    Replay feature
                  </GlowButton>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <OrchestratorTimeline />
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
