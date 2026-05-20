import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Copy, Check } from 'lucide-react'

interface TerminalPanelProps {
  lines: string[]
  taskId?: string
  isLive?: boolean
  startFrom?: number
}

const getLineStyle = (line: string): string => {
  if (line.startsWith('$')) return 'text-cyan-300 font-semibold'
  if (line.startsWith('PASS')) return 'text-emerald-400'
  if (line.startsWith('FAIL')) return 'text-crimson-400'
  if (line.startsWith('  ✓')) return 'text-emerald-500/80'
  if (line.startsWith('  ✗')) return 'text-crimson-400'
  if (line.startsWith('Test Suites:') || line.startsWith('Tests:') || line.startsWith('Time:') || line.startsWith('Snapshots:')) {
    return 'text-slate-300'
  }
  if (line.startsWith('✓')) return 'text-emerald-400 font-medium'
  if (line === '') return 'opacity-0 select-none h-3'
  return 'text-slate-400/90'
}

export function TerminalPanel({ lines, taskId = 'task-001', isLive = true, startFrom = 0 }: TerminalPanelProps) {
  const [visibleCount, setVisibleCount] = useState(startFrom)
  const [copied, setCopied] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Stream lines progressively. When startFrom > 0, previously shown lines are
  // instantly revealed and only the new tail streams in.
  useEffect(() => {
    setVisibleCount(startFrom)
    let i = startFrom
    const tick = () => {
      i++
      setVisibleCount(i)
      if (i < lines.length) {
        const delay = lines[i - 1]?.startsWith('$') ? 180 : lines[i - 1]?.includes('...') ? 120 : 35
        setTimeout(tick, delay)
      }
    }
    const timer = setTimeout(tick, startFrom > 0 ? 100 : 300)
    return () => clearTimeout(timer)
  }, [lines.length, startFrom])

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [visibleCount])

  const handleCopy = () => {
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const visibleLines = lines.slice(0, visibleCount)
  const isStreaming = visibleCount < lines.length

  return (
    <div className="flex flex-col h-full" style={{ background: 'rgba(0,0,0,0.4)' }}>
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.05] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-mono">
            <Terminal size={10} />
            <span>agent-runtime</span>
            <span className="text-slate-700">·</span>
            <span>{taskId}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isStreaming && isLive && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-500/70">
              <motion.div
                className="w-1 h-1 rounded-full bg-cyan-400"
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              streaming
            </div>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-slate-400 transition-colors font-mono"
          >
            {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
            {copied ? 'copied' : 'copy'}
          </button>
        </div>
      </div>

      {/* Output */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto scrollbar-thin p-5 font-mono text-xs leading-[1.7]"
      >
        <AnimatePresence>
          {visibleLines.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className={getLineStyle(line)}
            >
              {line.startsWith('$')
                ? <><span className="text-slate-600 mr-2 select-none">❯</span>{line.slice(2)}</>
                : (line || <span>&nbsp;</span>)
              }
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Active cursor */}
        {isLive && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-slate-600 select-none">❯</span>
            <motion.span
              className="inline-block w-[7px] h-[14px] bg-cyan-400/70 rounded-[1px]"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        )}

        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Active glow overlay — subtle cyan when streaming */}
      {isStreaming && (
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-b-none"
          style={{
            background: 'radial-gradient(ellipse at bottom center, rgba(34,211,238,0.02) 0%, transparent 70%)',
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </div>
  )
}
