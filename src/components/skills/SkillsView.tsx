import { motion } from 'framer-motion'
import { Zap, Clock, BarChart2, ArrowRight, Plus } from 'lucide-react'
import { GlassPanel } from '../shared/GlassPanel'
import { GlowButton } from '../shared/GlowButton'
import { mockSkills } from '../../data/mockSkills'
import type { Skill } from '../../types'

const categoryConfig: Record<Skill['category'], { color: string; bg: string; label: string }> = {
  testing: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Testing' },
  refactoring: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', label: 'Refactoring' },
  review: { color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Review' },
  documentation: { color: 'text-violet-400', bg: 'bg-violet-500/10', label: 'Docs' },
  analysis: { color: 'text-slate-400', bg: 'bg-slate-500/10', label: 'Analysis' },
  generation: { color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Generation' },
}

export function SkillsView() {
  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-base font-semibold text-white">Skills</h1>
          <p className="text-xs text-slate-500 mt-0.5">Reusable multi-step workflows that agents can execute</p>
        </div>
        <GlowButton variant="primary" size="sm" icon={<Plus size={14} />}>
          New Skill
        </GlowButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {mockSkills.map((skill, i) => {
          const cat = categoryConfig[skill.category]
          return (
            <motion.div
              key={skill.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -2 }}
            >
              <GlassPanel className="p-4 cursor-pointer hover:border-white/12 transition-all h-full flex flex-col">
                {/* Header */}
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
                    <div className="text-xs font-mono text-slate-300">{skill.usageCount}</div>
                    <div className="text-[9px] text-slate-600">uses</div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed mb-4 flex-1">{skill.description}</p>

                {/* Steps preview */}
                <div className="mb-4">
                  <div className="text-[9px] text-slate-600 font-mono uppercase tracking-wider mb-2">Steps ({skill.steps.length})</div>
                  <div className="space-y-1">
                    {skill.steps.slice(0, 4).map((step, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] text-slate-500">
                        <div className="w-3.5 h-3.5 rounded flex items-center justify-center bg-white/[0.04] text-[8px] font-mono text-slate-600 flex-shrink-0">
                          {i + 1}
                        </div>
                        <span className="truncate">{step}</span>
                      </div>
                    ))}
                    {skill.steps.length > 4 && (
                      <div className="text-[10px] text-slate-700 font-mono pl-5">+{skill.steps.length - 4} more</div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                  <div className="flex items-center gap-3 text-[10px] text-slate-600 font-mono">
                    <div className="flex items-center gap-1">
                      <Clock size={9} />
                      <span>~{skill.avgDurationMinutes}m</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BarChart2 size={9} />
                      <span>{skill.requiredTools.length} tools</span>
                    </div>
                  </div>
                  <button className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors font-mono">
                    Run <ArrowRight size={10} />
                  </button>
                </div>
              </GlassPanel>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
