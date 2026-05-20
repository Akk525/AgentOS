import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MessageSquarePlus, X, Send, Lightbulb } from 'lucide-react'
import { GlassPanel } from '../shared/GlassPanel'
import { GlowButton } from '../shared/GlowButton'

const suggestions = [
  'Focus on the mutex error propagation — make sure concurrent callers all receive the rejection.',
  'The test for concurrent refresh should simulate at least 5 simultaneous requests.',
  'Check if apiClient.ts also needs the same guard pattern.',
  'Add a timeout to the refresh — if it takes more than 10s, fail fast.',
]

interface InjectModalProps {
  onClose: () => void
  onSubmit: (instruction: string) => void
}

export function InjectModal({ onClose, onSubmit }: InjectModalProps) {
  const [instruction, setInstruction] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    if (!instruction.trim()) return
    setSubmitted(true)
    setTimeout(() => {
      onSubmit(instruction.trim())
      onClose()
    }, 600)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 8 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="w-full max-w-lg"
      >
        <GlassPanel strong className="overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between p-5 pb-4 border-b border-white/[0.05]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <MessageSquarePlus size={14} className="text-violet-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Inject Instruction</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Send a clarification to the agent without interrupting the session</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-600 hover:text-slate-400 transition-colors mt-0.5">
              <X size={15} />
            </button>
          </div>

          {/* Input */}
          <div className="p-5">
            <textarea
              ref={inputRef}
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              onKeyDown={handleKey}
              placeholder="What should the agent know or do differently? Be specific — the agent will read this and adjust its approach."
              rows={4}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-700 outline-none focus:border-violet-500/30 focus:ring-1 focus:ring-violet-500/10 transition-all resize-none font-mono text-[12px] leading-relaxed"
            />

            {/* Suggestions */}
            <div className="mt-3">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-600 mb-2 font-mono">
                <Lightbulb size={10} />
                suggestions
              </div>
              <div className="space-y-1">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setInstruction(s)}
                    className="w-full text-left text-[11px] text-slate-600 hover:text-slate-300 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-all leading-relaxed border border-transparent hover:border-white/[0.05]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 pb-5">
            <span className="text-[10px] text-slate-700 font-mono">⌘↵ to send</span>
            <div className="flex items-center gap-2">
              <GlowButton variant="ghost" onClick={onClose} size="sm">Cancel</GlowButton>
              <GlowButton
                variant="primary"
                size="sm"
                icon={submitted ? undefined : <Send size={12} />}
                onClick={handleSubmit}
                disabled={!instruction.trim() || submitted}
              >
                {submitted ? 'Sending...' : 'Send to Agent'}
              </GlowButton>
            </div>
          </div>
        </GlassPanel>
      </motion.div>
    </motion.div>
  )
}
