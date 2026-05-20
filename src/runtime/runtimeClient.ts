import { runtimeEngine } from './runtimeEngine'
import type { RuntimeEventListener } from './runtimeTypes'
import type { SessionLaunchConfig } from '../types'

const ts = () => new Date().toISOString()

// ── RuntimeClient ─────────────────────────────────────────────────────────────
// UI-facing API. The UI never touches RuntimeEngine directly — it calls this.
// Swap out the engine reference to wire up a real daemon later
// (Tauri IPC, WebSocket, local process) without touching any component code.

class RuntimeClient {
  subscribe(fn: RuntimeEventListener): () => void {
    return runtimeEngine.subscribe(fn)
  }

  takeControl(): void {
    runtimeEngine.processCommand({ type: 'TAKE_CONTROL', timestamp: ts() })
  }

  returnControl(): void {
    runtimeEngine.processCommand({ type: 'RETURN_CONTROL', timestamp: ts() })
  }

  pauseSession(): void {
    runtimeEngine.processCommand({ type: 'PAUSE_SESSION', timestamp: ts() })
  }

  resumeSession(): void {
    runtimeEngine.processCommand({ type: 'RESUME_SESSION', timestamp: ts() })
  }

  injectInstruction(instruction: string): void {
    runtimeEngine.processCommand({ type: 'INJECT_INSTRUCTION', timestamp: ts(), payload: { instruction } })
  }

  runTerminalCommand(command: string): void {
    runtimeEngine.processCommand({ type: 'RUN_TERMINAL_COMMAND', timestamp: ts(), payload: { command } })
  }

  rerunTests(): void {
    runtimeEngine.processCommand({ type: 'RERUN_TESTS', timestamp: ts() })
  }

  mountWorkspace(workspaceId: string, localPath: string): void {
    runtimeEngine.processCommand({ type: 'MOUNT_WORKSPACE', timestamp: ts(), payload: { workspaceId, localPath } })
  }

  unmountWorkspace(workspaceId: string): void {
    runtimeEngine.processCommand({ type: 'UNMOUNT_WORKSPACE', timestamp: ts(), payload: { workspaceId } })
  }

  approveEscalation(escalationId: string): void {
    runtimeEngine.processCommand({ type: 'APPROVE_ESCALATION', timestamp: ts(), payload: { escalationId } })
  }

  denyEscalation(escalationId: string): void {
    runtimeEngine.processCommand({ type: 'DENY_ESCALATION', timestamp: ts(), payload: { escalationId } })
  }

  restartDaemon(): void {
    runtimeEngine.processCommand({ type: 'RESTART_DAEMON', timestamp: ts() })
  }

  simulateEscalation(): void {
    runtimeEngine.processCommand({ type: 'SIMULATE_ESCALATION', timestamp: ts() })
  }

  pingProvider(providerId: string): void {
    runtimeEngine.processCommand({ type: 'PING_PROVIDER', timestamp: ts(), payload: { providerId } })
  }

  pingAllProviders(): void {
    runtimeEngine.processCommand({ type: 'PING_ALL_PROVIDERS', timestamp: ts() })
  }

  runDiagnostics(): void {
    runtimeEngine.processCommand({ type: 'RUN_DIAGNOSTICS', timestamp: ts() })
  }

  spawnSession(config: SessionLaunchConfig): void {
    runtimeEngine.processCommand({ type: 'SPAWN_SESSION', timestamp: ts(), payload: { config } })
  }

  createWorktree(workspaceId: string, branch: string): void {
    runtimeEngine.processCommand({ type: 'CREATE_WORKTREE', timestamp: ts(), payload: { workspaceId, branch } })
  }

  runRealCommand(command: string, worktreePath?: string): void {
    runtimeEngine.processCommand({ type: 'RUN_REAL_COMMAND', timestamp: ts(), payload: { command, worktreePath } })
  }

  getGitDiff(worktreePath?: string): void {
    runtimeEngine.processCommand({ type: 'GET_GIT_DIFF', timestamp: ts(), payload: { worktreePath } })
  }
}

export const runtimeClient = new RuntimeClient()
