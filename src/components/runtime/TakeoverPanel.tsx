import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { UserCheck, ArrowLeft, Terminal } from 'lucide-react'

interface TakeoverPanelProps {
  prevOutput: string[]
  onReturnToAgent: () => void
  onCommandRun: (cmd: string) => void
}

const getLineStyle = (line: string): string => {
  if (line.startsWith('❯ ')) return 'text-amber-300 font-semibold'
  if (line.startsWith('[human]')) return 'text-amber-400'
  if (line.startsWith('  ✓') || line.startsWith('PASS')) return 'text-emerald-400'
  if (line.startsWith('  ✗') || line.startsWith('FAIL')) return 'text-crimson-400'
  if (line === '') return 'opacity-0 h-3 select-none'
  return 'text-slate-500'
}

export function TakeoverPanel({ prevOutput, onReturnToAgent, onCommandRun }: TakeoverPanelProps) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [liveOutput, setLiveOutput] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [liveOutput])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cmd = input.trim()
    if (!cmd) return

    const newLines = [`❯ ${cmd}`]

    // Simulate basic command responses
    if (cmd.startsWith('npm test')) {
      newLines.push('', 'Running test suite...', 'PASS src/auth/__tests__/tokenManager.test.ts', '  ✓ All 18 tests passing', '', 'Tests: 18 passed, 18 total', '')
    } else if (cmd.startsWith('git status')) {
      newLines.push('', 'On branch fix/auth-race', 'Changes not staged for commit:', '  modified:   src/auth/tokenManager.ts', '  modified:   src/middleware/authGuard.ts', '')
    } else if (cmd.startsWith('git diff')) {
      newLines.push('', 'diff --git a/src/auth/tokenManager.ts b/src/auth/tokenManager.ts', '--- a/src/auth/tokenManager.ts', '+++ b/src/auth/tokenManager.ts', '@@ -42,6 +42,12 @@', '+  if (pendingRefresh) return pendingRefresh', '')
    } else if (cmd === 'ls' || cmd === 'ls -la') {
      newLines.push('', 'src/  tests/  package.json  tsconfig.json  README.md', '')
    } else if (cmd.startsWith('cat ')) {
      newLines.push('', `[contents of ${cmd.slice(4)} would appear here]`, '')
    } else {
      newLines.push(`zsh: ${cmd}: output would appear here`, '')
    }

    setLiveOutput(prev => [...prev, ...newLines])
    setHistory(h => [cmd, ...h])
    setHistoryIdx(-1)
    setInput('')
    onCommandRun(cmd)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const nextIdx = Math.min(historyIdx + 1, history.length - 1)
      setHistoryIdx(nextIdx)
      setInput(history[nextIdx] ?? '')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIdx = Math.max(historyIdx - 1, -1)
      setHistoryIdx(nextIdx)
      setInput(nextIdx === -1 ? '' : history[nextIdx] ?? '')
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'rgba(0,0,0,0.5)' }}>
      {/* Takeover banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-4 py-2 flex-shrink-0"
        style={{ background: 'rgba(251,191,36,0.06)', borderBottom: '1px solid rgba(251,191,36,0.15)' }}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex items-center gap-1.5 ml-1">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-amber-400"
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[11px] font-mono text-amber-300">Manual Control</span>
            <span className="text-[10px] text-slate-600 font-mono ml-1">· agent paused</span>
          </div>
        </div>
        <button
          onClick={onReturnToAgent}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/35 transition-all"
        >
          <ArrowLeft size={10} />
          Return to Agent
        </button>
      </motion.div>

      {/* Previous agent output — dimmed */}
      {prevOutput.length > 0 && (
        <div className="px-5 pt-4 pb-2 border-b border-white/[0.04] opacity-30">
          <div className="flex items-center gap-1.5 mb-2">
            <Terminal size={9} className="text-slate-600" />
            <span className="text-[9px] text-slate-700 font-mono uppercase tracking-widest">Agent output (read-only)</span>
          </div>
          <div className="font-mono text-[11px] text-slate-600 leading-relaxed max-h-24 overflow-hidden">
            {prevOutput.slice(-6).map((line, i) => (
              <div key={i}>{line || <span>&nbsp;</span>}</div>
            ))}
          </div>
        </div>
      )}

      {/* Live terminal output */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 pt-4 font-mono text-[12px] leading-[1.7]">
        {liveOutput.length === 0 && (
          <div className="text-[11px] text-slate-700 font-mono mb-4">
            You have control. Type commands below. The agent is paused.
          </div>
        )}
        {liveOutput.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -2 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.1 }}
            className={getLineStyle(line)}
          >
            {line || <span>&nbsp;</span>}
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-5 py-3 border-t flex-shrink-0"
        style={{ borderColor: 'rgba(251,191,36,0.15)', background: 'rgba(0,0,0,0.3)' }}
      >
        <UserCheck size={12} className="text-amber-500/60 flex-shrink-0" />
        <span className="text-amber-400/70 font-mono text-[12px] flex-shrink-0">❯</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Run a command... (↑↓ for history)"
          className="flex-1 bg-transparent font-mono text-[12px] text-amber-200 placeholder-amber-900/60 outline-none"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
        />
      </form>
    </div>
  )
}
