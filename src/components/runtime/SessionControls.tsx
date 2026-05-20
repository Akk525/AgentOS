import { motion, AnimatePresence } from 'framer-motion'
import {
  Pause, Play, MessageSquarePlus, UserCheck, RotateCcw,
  TestTube, Cpu, ChevronDown, ArrowLeft,
} from 'lucide-react'
import { useState } from 'react'
import type { SessionMode } from '../../types'

interface SessionControlsProps {
  sessionMode: SessionMode
  onPause: () => void
  onResume: () => void
  onInject: () => void
  onTakeover: () => void
  onReturnToAgent: () => void
  onRerunTests: () => void
  onReplay: () => void
  isRunning: boolean
}

const modelOptions = ['claude-sonnet-4-6', 'claude-opus-4-7', 'gpt-4o', 'llama3.3:70b']

export function SessionControls({
  sessionMode, onPause, onResume, onInject,
  onTakeover, onReturnToAgent, onRerunTests, onReplay,
  isRunning,
}: SessionControlsProps) {
  const [modelOpen, setModelOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-6')

  const isHumanControlled = sessionMode === 'human_controlled'
  const isPaused = sessionMode === 'paused'

  return (
    <div className="relative flex items-center justify-between px-5 py-2 border-b border-white/[0.05] flex-shrink-0"
      style={{ background: 'rgba(0,0,0,0.15)' }}>

      {/* Left controls */}
      <div className="flex items-center gap-1">

        {/* Pause / Resume */}
        {!isHumanControlled && (
          <ControlButton
            onClick={isPaused ? onResume : onPause}
            icon={isPaused ? <Play size={12} /> : <Pause size={12} />}
            label={isPaused ? 'Resume' : 'Pause'}
            active={isPaused}
            activeColor="text-amber-400 bg-amber-500/10 border-amber-500/20"
            disabled={!isRunning && !isPaused}
          />
        )}

        {/* Inject */}
        {!isHumanControlled && (
          <ControlButton
            onClick={onInject}
            icon={<MessageSquarePlus size={12} />}
            label="Inject"
            disabled={isPaused}
            tooltip="Inject an instruction or clarification without stopping the agent"
          />
        )}

        {/* Take Control / Return */}
        {isHumanControlled ? (
          <motion.button
            onClick={onReturnToAgent}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 hover:border-cyan-500/40 transition-all"
          >
            <ArrowLeft size={12} />
            Return to Agent
          </motion.button>
        ) : (
          <ControlButton
            onClick={onTakeover}
            icon={<UserCheck size={12} />}
            label="Take Control"
            disabled={isPaused}
            tooltip="Take over the terminal and run commands manually"
          />
        )}

        <div className="w-px h-4 bg-white/[0.06] mx-1" />

        {/* Rerun tests */}
        <ControlButton
          onClick={onRerunTests}
          icon={<TestTube size={12} />}
          label="Rerun Tests"
          disabled={isHumanControlled}
        />

        {/* Swap model */}
        <div className="relative">
          <ControlButton
            onClick={() => setModelOpen(o => !o)}
            icon={<Cpu size={12} />}
            label={selectedModel.split('-').slice(-2).join('-')}
            rightIcon={<ChevronDown size={9} className={`transition-transform ${modelOpen ? 'rotate-180' : ''}`} />}
            disabled={isHumanControlled}
          />
          <AnimatePresence>
            {modelOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="absolute left-0 top-full mt-1 w-44 rounded-xl border border-white/[0.08] overflow-hidden z-50"
                style={{ background: 'rgba(8,8,16,0.95)', backdropFilter: 'blur(20px)' }}
              >
                {modelOptions.map(m => (
                  <button
                    key={m}
                    onClick={() => { setSelectedModel(m); setModelOpen(false) }}
                    className={`w-full px-3 py-2 text-left text-[11px] font-mono transition-colors ${
                      m === selectedModel ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right: session state indicator + replay */}
      <div className="flex items-center gap-3">
        {/* State badge */}
        <AnimatePresence mode="wait">
          {isHumanControlled && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20"
            >
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-amber-400"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-[10px] font-mono text-amber-300">Manual Control Active</span>
            </motion.div>
          )}
          {isPaused && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/[0.08] border border-amber-500/[0.15]"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-[10px] font-mono text-amber-400/80">Session Paused</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Replay */}
        <button
          onClick={onReplay}
          className="flex items-center gap-1.5 text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.03]"
        >
          <RotateCcw size={10} />
          Replay
        </button>
      </div>
    </div>
  )
}

interface ControlButtonProps {
  onClick: () => void
  icon: React.ReactNode
  label: string
  rightIcon?: React.ReactNode
  active?: boolean
  activeColor?: string
  disabled?: boolean
  tooltip?: string
}

function ControlButton({ onClick, icon, label, rightIcon, active, activeColor, disabled }: ControlButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      className={`
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all
        ${active
          ? (activeColor ?? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20')
          : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] border border-transparent'
        }
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span>{label}</span>
      {rightIcon}
    </motion.button>
  )
}
