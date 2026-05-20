import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'
import type { Agent } from '../../types'

const roleConfig: Record<Agent['role'], { emoji: string; bg: string; glow: string }> = {
  debugger: { emoji: '🐛', bg: 'bg-cyan-500/10 border-cyan-500/20', glow: 'shadow-[0_0_12px_rgba(34,211,238,0.15)]' },
  reviewer: { emoji: '👁', bg: 'bg-violet-500/10 border-violet-500/20', glow: 'shadow-[0_0_12px_rgba(167,139,250,0.15)]' },
  'test-writer': { emoji: '🧪', bg: 'bg-emerald-500/10 border-emerald-500/20', glow: 'shadow-[0_0_12px_rgba(52,211,153,0.15)]' },
  refactorer: { emoji: '♻️', bg: 'bg-amber-500/10 border-amber-500/20', glow: 'shadow-[0_0_12px_rgba(251,191,36,0.15)]' },
  architect: { emoji: '🏛', bg: 'bg-slate-500/10 border-slate-500/20', glow: '' },
  general: { emoji: '⚡', bg: 'bg-crimson-500/10 border-crimson-500/20', glow: 'shadow-[0_0_12px_rgba(244,63,94,0.15)]' },
}

const statusDot: Record<string, string> = {
  running: 'bg-cyan-400',
  idle: 'bg-slate-600',
  paused: 'bg-amber-400',
  error: 'bg-crimson-500',
}

interface AgentAvatarProps {
  role: Agent['role']
  status: Agent['status']
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { sm: 'w-7 h-7 text-sm', md: 'w-9 h-9 text-base', lg: 'w-12 h-12 text-xl' }
const dotSizes = { sm: 'w-2 h-2 -bottom-0.5 -right-0.5', md: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5', lg: 'w-3 h-3 -bottom-0.5 -right-0.5' }

export function AgentAvatar({ role, status, size = 'md', className }: AgentAvatarProps) {
  const config = roleConfig[role]
  const isRunning = status === 'running'

  return (
    <div className={cn('relative flex-shrink-0', className)}>
      <motion.div
        animate={isRunning ? { boxShadow: ['0 0 0px rgba(34,211,238,0)', '0 0 16px rgba(34,211,238,0.25)', '0 0 0px rgba(34,211,238,0)'] } : {}}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        className={cn(
          'rounded-xl border flex items-center justify-center',
          config.bg,
          !isRunning && config.glow,
          sizes[size],
        )}
      >
        <span>{config.emoji}</span>
      </motion.div>
      <div className={cn(
        'absolute rounded-full border-2 border-[#060609]',
        statusDot[status] ?? 'bg-slate-600',
        dotSizes[size],
        isRunning && 'animate-pulse',
      )} />
    </div>
  )
}
