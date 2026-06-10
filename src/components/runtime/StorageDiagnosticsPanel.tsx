import { Database, HardDrive, Network } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useTaskGraph } from '../../context/TaskGraphContext'
import type { StoreInitResult, StoreStatus } from '../../runtime/store'

interface StorageDiagnosticsPanelProps {
  init: StoreInitResult | null
  status: StoreStatus | null
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-mono text-slate-300">{value}</span>
    </div>
  )
}

export function StorageDiagnosticsPanel({ init, status }: StorageDiagnosticsPanelProps) {
  const { activeProject, readyNodeIds, blockedNodeIds, loaded } = useTaskGraph()
  const active = init?.available

  return (
    <div className="border-b border-white/[0.06] px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <Database size={12} className={active ? 'text-cyan-500' : 'text-slate-600'} />
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Local Storage</span>
        <span className={cn(
          'ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full',
          active
            ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20'
            : 'bg-amber-500/10 text-amber-600/70 border border-amber-500/15',
        )}>
          {active ? 'active' : 'unavailable'}
        </span>
      </div>

      {active && init ? (
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-[10px] font-mono text-slate-600">
            <HardDrive size={10} className="flex-shrink-0 mt-0.5 text-slate-700" />
            <span className="break-all">{init.dbPath}</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            <Stat label="schema" value={`v${init.schemaVersion}`} />
            {status && (
              <>
                <Stat label="projects" value={status.projectCount} />
                <Stat label="nodes" value={status.nodeCount} />
                <Stat label="edges" value={status.edgeCount} />
                <Stat label="events" value={status.eventCount} />
                <Stat label="sessions" value={status.sessionCount} />
              </>
            )}
          </div>
          {loaded && activeProject && (
            <div className="flex items-start gap-2 pt-1 border-t border-white/[0.04]">
              <Network size={10} className="flex-shrink-0 mt-0.5 text-slate-700" />
              <div className="text-[10px] font-mono text-slate-600 space-y-0.5">
                <div className="text-slate-400">{activeProject.title}</div>
                <div>
                  {readyNodeIds.length} ready · {blockedNodeIds.length} blocked
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[11px] font-mono text-slate-600">
          SQLite persistence is available in the desktop app. Run <code className="text-slate-500">npm run dev</code> to use the native runtime.
        </p>
      )}
    </div>
  )
}
