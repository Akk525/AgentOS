import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

interface RuntimeBadgeProps {
  startSeconds: number
  running?: boolean
  className?: string
}

function formatLive(s: number): string {
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}m ${rem.toString().padStart(2, '0')}s`
}

export function RuntimeBadge({ startSeconds, running = false, className }: RuntimeBadgeProps) {
  const [seconds, setSeconds] = useState(startSeconds)

  useEffect(() => {
    if (!running) { setSeconds(startSeconds); return }
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [running, startSeconds])

  return (
    <div className={cn('flex items-center gap-1.5 font-mono', className)}>
      {running && (
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-cyan-400"
          animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <span className={cn('text-[11px] tabular-nums', running ? 'text-cyan-300' : 'text-slate-500')}>
        {formatLive(seconds)}
      </span>
    </div>
  )
}
