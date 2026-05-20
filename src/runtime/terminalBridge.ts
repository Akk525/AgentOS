// TerminalBridge — abstraction layer for terminal session management.
// In production: wraps Tauri's PTY sidecar or a local process via IPC.
// Currently mocked with simulated output streaming.

import type { TerminalBridgeSession } from '../types'

type OutputHandler = (data: string) => void
type ExitHandler = (code: number) => void

export interface TerminalSessionHandle {
  readonly sessionId: string
  write(data: string): void
  resize(cols: number, rows: number): void
  terminate(): void
  onOutput(fn: OutputHandler): () => void
  onExit(fn: ExitHandler): () => void
}

class MockTerminalSession implements TerminalSessionHandle {
  readonly sessionId: string
  private outputHandlers = new Set<OutputHandler>()
  private exitHandlers = new Set<ExitHandler>()
  private terminated = false

  constructor(sessionId: string, workspaceId: string) {
    this.sessionId = sessionId
    // Emit a shell prompt after a brief startup delay
    setTimeout(() => {
      this.emit(`\x1b[32m${workspaceId}\x1b[0m \x1b[34m$\x1b[0m `)
    }, 300)
  }

  write(data: string): void {
    if (this.terminated) return
    // Echo the input and simulate a simple response
    this.emit(data)
    if (data.trim()) {
      setTimeout(() => {
        const cmd = data.trim()
        if (cmd === 'ls') {
          this.emit('\r\nsrc/  package.json  tsconfig.json  README.md\r\n$ ')
        } else if (cmd.startsWith('git ')) {
          this.emit(`\r\n[git] ${cmd.slice(4)}\r\n$ `)
        } else if (cmd === 'pwd') {
          this.emit('\r\n~/projects/workspace\r\n$ ')
        } else {
          this.emit(`\r\nbash: ${cmd}: command executed\r\n$ `)
        }
      }, 120)
    }
  }

  resize(_cols: number, _rows: number): void {
    // Would send SIGWINCH to the PTY in production
  }

  terminate(): void {
    if (this.terminated) return
    this.terminated = true
    this.emit('\r\nSession terminated.\r\n')
    this.exitHandlers.forEach(fn => fn(0))
  }

  onOutput(fn: OutputHandler): () => void {
    this.outputHandlers.add(fn)
    return () => this.outputHandlers.delete(fn)
  }

  onExit(fn: ExitHandler): () => void {
    this.exitHandlers.add(fn)
    return () => this.exitHandlers.delete(fn)
  }

  private emit(data: string): void {
    this.outputHandlers.forEach(fn => fn(data))
  }
}

class TerminalBridge {
  private sessions = new Map<string, MockTerminalSession>()

  spawn(workspaceId: string): { handle: TerminalSessionHandle; meta: TerminalBridgeSession } {
    const sessionId = `term-${workspaceId}-${Date.now()}`
    const session = new MockTerminalSession(sessionId, workspaceId)
    this.sessions.set(sessionId, session)

    const meta: TerminalBridgeSession = {
      id: sessionId,
      workspaceId,
      cols: 120,
      rows: 30,
      status: 'active',
      startedAt: new Date().toISOString(),
    }

    return { handle: session, meta }
  }

  get(sessionId: string): MockTerminalSession | undefined {
    return this.sessions.get(sessionId)
  }

  terminate(sessionId: string): void {
    this.sessions.get(sessionId)?.terminate()
    this.sessions.delete(sessionId)
  }
}

export const terminalBridge = new TerminalBridge()
