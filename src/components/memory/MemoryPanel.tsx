import { useState } from 'react'
import { Brain, Download, Search } from 'lucide-react'
import { useTaskGraph } from '../../context/TaskGraphContext'
import { useProjectMemories } from '../../hooks/useProjectMemories'
import { exportMemoryBundle } from '../../runtime/memory/exportMemoryBundle'
import type { AgentMemoryType } from '../../types/graph'
import { GlowButton } from '../shared/GlowButton'

const MEMORY_TYPES: Array<AgentMemoryType | 'all'> = [
  'all',
  'decision',
  'pattern',
  'bug_fix',
  'convention',
  'review_note',
]

export function MemoryPanel() {
  const { activeProject } = useTaskGraph()
  const {
    memories,
    loading,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    refresh,
  } = useProjectMemories(activeProject?.id)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (!activeProject) return
    setExporting(true)
    try {
      const bundle = await exportMemoryBundle(activeProject.id)
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `agentos-memory-${activeProject.id}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  if (!activeProject) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-slate-500 font-mono">
        Select a project to view agent memory
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05] flex-shrink-0">
        <Brain size={14} className="text-violet-400" />
        <span className="text-xs font-mono text-slate-400">Agent memory</span>
        <span className="text-[10px] font-mono text-slate-700 ml-auto">{memories.length} entries</span>
        <GlowButton
          variant="secondary"
          size="sm"
          icon={<Download size={11} />}
          onClick={() => void handleExport()}
          disabled={exporting}
        >
          Export
        </GlowButton>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.04] flex-shrink-0">
        <div className="flex-1 relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void refresh()}
            placeholder="Search memories…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono text-slate-300 placeholder:text-slate-700"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as AgentMemoryType | 'all')}
          className="px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[10px] font-mono text-slate-400"
        >
          {MEMORY_TYPES.map(t => (
            <option key={t} value={t}>
              {t === 'all' ? 'All types' : t}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-2">
        {loading ? (
          <p className="text-[11px] font-mono text-slate-600">Loading memories…</p>
        ) : memories.length === 0 ? (
          <p className="text-[11px] font-mono text-slate-600">
            No memories yet. Complete build/review/test tasks to capture project knowledge.
          </p>
        ) : (
          memories.map(memory => (
            <div
              key={memory.id}
              className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 space-y-1.5"
            >
              <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-widest">
                <span className="text-violet-400">{memory.memoryType}</span>
                {memory.agentRole && (
                  <span className="text-slate-600">· {memory.agentRole}</span>
                )}
                <span className="text-slate-700 ml-auto">
                  {new Date(memory.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-[12px] text-slate-300 leading-relaxed">{memory.content}</p>
              {memory.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {memory.tags.filter(t => !t.startsWith('hash:')).map(tag => (
                    <span
                      key={tag}
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
