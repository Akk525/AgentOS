import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, RefreshCw, BarChart2, ArrowRight, FolderOpen } from 'lucide-react'
import { GlassPanel } from '../shared/GlassPanel'
import { GlowButton } from '../shared/GlowButton'
import { useSkills } from '../../hooks/useSkills'
import type { LoadedSkill, SkillScope } from '../../runtime/skills/skillTypes'

const scopeConfig: Record<SkillScope, { color: string; bg: string; label: string }> = {
  personal: { color: 'text-violet-400', bg: 'bg-violet-500/10', label: 'Personal' },
  project: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', label: 'Project' },
  bundled: { color: 'text-slate-400', bg: 'bg-slate-500/10', label: 'Bundled' },
}

function previewLines(body: string, max = 4): string[] {
  return body
    .split('\n')
    .map(l => l.replace(/^#+\s*/, '').trim())
    .filter(l => l.length > 0 && !l.startsWith('---'))
    .slice(0, max)
}

export function SkillsView() {
  const { skills, loading, error, refresh } = useSkills()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-base font-semibold text-white">Skills</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            SKILL.md workflows from ~/.cursor/skills, project .cursor/skills, and bundled defaults
          </p>
        </div>
        <GlowButton variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={() => void refresh()}>
          Refresh
        </GlowButton>
      </div>

      {loading && skills.length === 0 && (
        <p className="text-xs font-mono text-slate-600">Loading skills…</p>
      )}
      {error && (
        <p className="text-xs font-mono text-crimson-400 mb-4">{error}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {skills.map((skill, i) => {
          const cat = scopeConfig[skill.scope]
          const steps = previewLines(skill.body)
          const expanded = expandedId === skill.id
          return (
            <motion.div
              key={skill.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -2 }}
            >
              <GlassPanel
                className="p-4 cursor-pointer hover:border-white/12 transition-all h-full flex flex-col"
                onClick={() => setExpandedId(expanded ? null : skill.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Zap size={13} className={cat.color} />
                      <h3 className="text-sm font-semibold text-white">{skill.name}</h3>
                    </div>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${cat.bg} ${cat.color}`}>
                      {cat.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] font-mono text-slate-600">{skill.id}</div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed mb-4 flex-1">{skill.description}</p>

                <div className="mb-4">
                  <div className="text-[9px] text-slate-600 font-mono uppercase tracking-wider mb-2">
                    Instructions ({steps.length}{expanded ? '+' : ''})
                  </div>
                  <div className="space-y-1">
                    {(expanded ? previewLines(skill.body, 12) : steps).map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[10px] text-slate-500">
                        <div className="w-3.5 h-3.5 rounded flex items-center justify-center bg-white/[0.04] text-[8px] font-mono text-slate-600 flex-shrink-0">
                          {idx + 1}
                        </div>
                        <span className="truncate">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {skill.tools.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {skill.tools.map(tool => (
                      <span
                        key={tool}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-500 border border-white/[0.05]"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                  <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono min-w-0">
                    <FolderOpen size={9} className="flex-shrink-0" />
                    <span className="truncate" title={skill.sourcePath}>{skill.sourcePath}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono flex-shrink-0">
                    <BarChart2 size={9} />
                    <span>{skill.tools.length} tools</span>
                    <ArrowRight size={10} className="ml-1" />
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          )
        })}
      </div>

      {!loading && skills.length === 0 && (
        <p className="text-xs font-mono text-slate-600 mt-4">
          No skills found. Add SKILL.md files under ~/.cursor/skills or .cursor/skills in your repo.
        </p>
      )}
    </div>
  )
}

// Re-export for consumers that need the loaded type
export type { LoadedSkill }
