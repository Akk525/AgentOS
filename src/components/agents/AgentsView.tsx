import { motion } from 'framer-motion'
import { Zap, Shield, Thermometer, Plus } from 'lucide-react'
import { GlassPanel } from '../shared/GlassPanel'
import { StatusPill } from '../shared/StatusPill'
import { GlowButton } from '../shared/GlowButton'
import { mockAgents } from '../../data/mockAgents'
import { useSkills } from '../../hooks/useSkills'
import type { Agent } from '../../types'

const roleIcons: Record<Agent['role'], string> = {
  debugger: '🐛',
  reviewer: '👁',
  'test-writer': '🧪',
  refactorer: '♻️',
  architect: '🏛',
  general: '⚡',
}

const permissionColors: Record<string, string> = {
  read: 'text-slate-400 bg-slate-500/10',
  write: 'text-cyan-400 bg-cyan-500/10',
  execute: 'text-amber-400 bg-amber-500/10',
  admin: 'text-crimson-400 bg-crimson-500/10',
}

export function AgentsView() {
  const { skills } = useSkills()

  const resolveSkillName = (skillId: string) =>
    skills.find(s => s.id === skillId)?.name ?? skillId

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-base font-semibold text-white">Agents</h1>
          <p className="text-xs text-slate-500 mt-0.5">Reusable agent configurations with defined capabilities and constraints</p>
        </div>
        <GlowButton variant="primary" size="sm" icon={<Plus size={14} />}>
          New Agent
        </GlowButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {mockAgents.map((agent, i) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ y: -2 }}
          >
            <GlassPanel className="p-4 h-full cursor-pointer hover:border-white/12 transition-all">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-lg flex-shrink-0">
                    {roleIcons[agent.role]}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{agent.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-mono">{agent.model}</div>
                  </div>
                </div>
                <StatusPill status={agent.status} />
              </div>

              {/* Description */}
              <p className="text-[11px] text-slate-500 leading-relaxed mb-4">{agent.description}</p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center">
                  <div className="text-xs font-mono font-semibold text-white">{agent.tasksCompleted}</div>
                  <div className="text-[9px] text-slate-600 mt-0.5">completed</div>
                </div>
                <div className="text-center border-x border-white/[0.06]">
                  <div className="text-xs font-mono font-semibold text-emerald-400">{Math.round(agent.successRate * 100)}%</div>
                  <div className="text-[9px] text-slate-600 mt-0.5">success</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-mono font-semibold text-slate-300">{agent.avgRuntimeMinutes}m</div>
                  <div className="text-[9px] text-slate-600 mt-0.5">avg time</div>
                </div>
              </div>

              {/* Tools */}
              <div className="mb-3">
                <div className="text-[9px] text-slate-600 font-mono uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Zap size={9} /> Tools
                </div>
                <div className="flex flex-wrap gap-1">
                  {agent.tools.slice(0, 4).map(tool => (
                    <span key={tool} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-500 border border-white/[0.05]">
                      {tool}
                    </span>
                  ))}
                  {agent.tools.length > 4 && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-600">
                      +{agent.tools.length - 4}
                    </span>
                  )}
                </div>
              </div>

              {/* Skills */}
              {agent.skills.length > 0 && (
                <div className="mb-3">
                  <div className="text-[9px] text-slate-600 font-mono uppercase tracking-wider mb-1.5">
                    Skills
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {agent.skills.map(skillId => (
                      <span
                        key={skillId}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      >
                        {resolveSkillName(skillId)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                <div className="flex items-center gap-2">
                  {/* Permission */}
                  <div className={`flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded ${permissionColors[agent.permissionLevel]}`}>
                    <Shield size={8} />
                    {agent.permissionLevel}
                  </div>
                  {/* Temperature */}
                  <div className="flex items-center gap-1 text-[9px] font-mono text-slate-600">
                    <Thermometer size={8} />
                    {agent.temperature}
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-600">{agent.provider}</div>
              </div>
            </GlassPanel>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
