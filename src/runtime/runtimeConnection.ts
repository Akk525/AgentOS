// RuntimeConnection provides connection health utilities.
// In production this probes the daemon socket, checks IPC health,
// and handles reconnection backoff logic.

export type ConnectionQuality = 'excellent' | 'good' | 'degraded' | 'poor'

export interface ConnectionDiagnostics {
  quality: ConnectionQuality
  latencyMs: number
  dropRate: number
  lastPingAt: string
  reconnectAttempts: number
}

class RuntimeConnection {
  private diagnostics: ConnectionDiagnostics = {
    quality: 'excellent',
    latencyMs: 4,
    dropRate: 0,
    lastPingAt: new Date().toISOString(),
    reconnectAttempts: 0,
  }

  private listeners = new Set<(d: ConnectionDiagnostics) => void>()

  constructor() {
    // Simulate periodic ping responses
    setInterval(() => this.ping(), 3000)
  }

  getDiagnostics(): ConnectionDiagnostics {
    return { ...this.diagnostics }
  }

  subscribe(fn: (d: ConnectionDiagnostics) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private ping(): void {
    const latency = 2 + Math.random() * 12
    const quality: ConnectionQuality =
      latency < 5 ? 'excellent' :
      latency < 10 ? 'good' :
      latency < 20 ? 'degraded' : 'poor'

    this.diagnostics = {
      ...this.diagnostics,
      quality,
      latencyMs: Math.round(latency),
      lastPingAt: new Date().toISOString(),
    }
    this.listeners.forEach(fn => fn(this.getDiagnostics()))
  }
}

export const runtimeConnection = new RuntimeConnection()
