import { motion } from 'framer-motion'
import { X, GitBranch, Bot, Zap } from 'lucide-react'
import { useState } from 'react'
import { GlassPanel } from '../shared/GlassPanel'
import { GlowButton } from '../shared/GlowButton'
import { mockAgents } from '../../data/mockAgents'
import { mockSkills } from '../../data/mockSkills'

interface NewTaskModalProps {
  onClose: () => void
}

export function NewTaskModal({ onClose }: NewTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [repo, setRepo] = useState('')
  const [selectedAgent, setSelectedAgent] = useState(mockAgents[0].id)
  const [selectedSkill, setSelectedSkill] = useState('')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 16 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-xl"
      >
        <GlassPanel strong className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-white">New Task</h2>
              <p className="text-xs text-slate-500 mt-0.5">Create a task and assign it to an agent</p>
            </div>
            <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block font-mono">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Fix failing tests in auth module..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-crimson-500/40 focus:ring-1 focus:ring-crimson-500/20 transition-all"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500 mb-1.5 block font-mono">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the task in detail. What needs to happen, what constraints exist, what the expected outcome is..."
                rows={3}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-crimson-500/40 focus:ring-1 focus:ring-crimson-500/20 transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block font-mono">Repository</label>
                <div className="relative">
                  <GitBranch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    placeholder="org/repo"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-crimson-500/40 focus:ring-1 focus:ring-crimson-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1.5 block font-mono">Priority</label>
                <select className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-slate-200 outline-none focus:border-crimson-500/40 transition-all appearance-none">
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Agent selection */}
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block font-mono">Assign Agent</label>
              <div className="grid grid-cols-3 gap-2">
                {mockAgents.slice(0, 3).map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      selectedAgent === agent.id
                        ? 'border-crimson-500/40 bg-crimson-500/10 text-crimson-300'
                        : 'border-white/[0.06] bg-white/[0.02] text-slate-400 hover:border-white/10'
                    }`}
                  >
                    <Bot size={12} className="mb-1" />
                    <div className="text-xs font-medium truncate">{agent.name}</div>
                    <div className="text-[10px] font-mono opacity-60 truncate">{agent.model.split('-').slice(-2).join('-')}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Skill */}
            <div>
              <label className="text-xs text-slate-500 mb-1.5 flex items-center gap-1 font-mono">
                <Zap size={10} />
                Skill (optional)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {mockSkills.slice(0, 4).map(skill => (
                  <button
                    key={skill.id}
                    onClick={() => setSelectedSkill(prev => prev === skill.id ? '' : skill.id)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-all font-mono ${
                      selectedSkill === skill.id
                        ? 'border-violet-500/40 bg-violet-500/10 text-violet-300'
                        : 'border-white/[0.06] bg-white/[0.02] text-slate-500 hover:border-white/10 hover:text-slate-300'
                    }`}
                  >
                    {skill.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-white/[0.06]">
            <GlowButton variant="ghost" onClick={onClose}>Cancel</GlowButton>
            <GlowButton variant="primary" disabled={!title.trim()}>
              Create & Queue Task
            </GlowButton>
          </div>
        </GlassPanel>
      </motion.div>
    </motion.div>
  )
}
