import type { RuntimeDaemonState } from '../types'

// RuntimeDaemon owns the local process state.
// In production this would be a Tauri sidecar / local socket process.
// Currently mocked as an in-memory singleton that ticks uptime.

class RuntimeDaemon {
  private state: RuntimeDaemonState = {
    status: 'starting',
    version: '0.6.0-alpha',
    uptimeSeconds: 0,
    memoryMb: 0,
    cpuPercent: 0,
    activeSessions: 1,
    eventThroughput: 0,
    filesystemMounted: false,
    sandboxStatus: 'unavailable',
    dockerAvailable: false,
    ollamaDetected: false,
    providerStatuses: {
      anthropic: 'connecting',
      openai: 'disconnected',
      ollama: 'disconnected',
    },
  }

  private listeners = new Set<(state: RuntimeDaemonState) => void>()

  constructor() {
    // Simulate boot sequence
    setTimeout(() => this.boot(), 600)
  }

  getState(): RuntimeDaemonState {
    return { ...this.state }
  }

  subscribe(fn: (state: RuntimeDaemonState) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private boot(): void {
    this.patch({
      status: 'connected',
      memoryMb: 148,
      cpuPercent: 2.1,
      filesystemMounted: true,
      sandboxStatus: 'healthy',
      dockerAvailable: true,
      ollamaDetected: false,
      eventThroughput: 3.2,
      providerStatuses: {
        anthropic: 'connected',
        openai: 'disconnected',
        ollama: 'disconnected',
      },
    })

    // Detect ollama after a short probe delay
    setTimeout(() => {
      this.patch({ ollamaDetected: true, providerStatuses: { ...this.state.providerStatuses, ollama: 'connected' } })
    }, 3400)

    this.startTicker()
  }

  private startTicker(): void {
    setInterval(() => {
      const jitter = (range: number) => (Math.random() - 0.5) * range
      this.patch({
        uptimeSeconds: this.state.uptimeSeconds + 1,
        memoryMb: Math.max(120, Math.min(280, this.state.memoryMb + jitter(8))),
        cpuPercent: Math.max(0.5, Math.min(18, this.state.cpuPercent + jitter(3))),
        eventThroughput: Math.max(1, Math.min(12, this.state.eventThroughput + jitter(1.5))),
      })
    }, 1000)
  }

  simulateReconnect(): void {
    this.patch({ status: 'reconnecting' })
    setTimeout(() => this.patch({ status: 'connected' }), 2200)
  }

  private patch(partial: Partial<RuntimeDaemonState>): void {
    this.state = { ...this.state, ...partial }
    this.listeners.forEach(fn => fn(this.getState()))
  }
}

export const runtimeDaemon = new RuntimeDaemon()
