import type { RuntimeEventType, RuntimeEvent, RuntimeCommand, RuntimeEventListener } from './runtimeTypes'
import { interventionTerminalLines, updatedCompletionNote } from './runtimeMockData'
import { runtimeDaemon } from './runtimeDaemon'
import { providerRegistry } from './providers/providerRegistry'
import { getDesktopBridge, getEnvironment } from './desktop/desktopBridge'
import { executionCoordinator } from './executionCoordinator'
import { setRepoPath } from './execution/executionConfig'
import type { PermissionEscalation, LogLevel, LogSource, SessionLaunchConfig, LiveWorktree, PatchLifecycle } from '../types'

// ── Command risk classification ───────────────────────────────────────────────

type CommandRisk = 'safe' | 'medium' | 'blocked'

const SAFE_PREFIXES = [
  'ls', 'pwd', 'git status', 'git diff', 'git log',
  'npm test', 'npm run test', 'pnpm test', 'yarn test',
]

const BLOCKED_PATTERNS = [
  'rm ', 'sudo', 'chmod', 'chown', 'git reset', 'git clean', 'git push',
  'curl', 'wget', ' | ', ';', '&&', '||', '`', '$(', 'eval', 'exec', 'sh -c', 'bash -c',
]

function classifyCommand(cmd: string): { risk: CommandRisk; reason?: string } {
  const c = cmd.trim()
  for (const pattern of BLOCKED_PATTERNS) {
    if (c.includes(pattern)) {
      return { risk: 'blocked', reason: `Pattern '${pattern.trim()}' is not permitted` }
    }
  }
  const isSafe = SAFE_PREFIXES.some(p => c === p || c.startsWith(p + ' '))
  return isSafe ? { risk: 'safe' } : { risk: 'medium', reason: `Unknown command '${c.split(' ')[0]}'` }
}

const ts = () => new Date().toISOString()

// ── RuntimeEngine ─────────────────────────────────────────────────────────────
// The authoritative source of runtime state. Processes commands, emits events.
// Designed to be replaced by a real daemon (Tauri IPC, WebSocket, local process)
// without changing the RuntimeClient or Context interfaces.

class RuntimeEngine {
  private listeners = new Set<RuntimeEventListener>()
  private seq = 0
  private activeWorktreePath: string | null = null
  private activeRepoPath: string | null = null
  private pendingEscalation: PermissionEscalation | null = null

  constructor() {
    setTimeout(() => {
      this.emit('CONNECTION_STATUS', { status: 'connected' })
      this.emitNotification('info', 'Runtime connected', 'Agent session is live and running.')
      this.emitLog('info', 'daemon', 'Runtime daemon connected on ipc://agentOS.sock')
      this.startHeartbeat()
      this.bridgeDaemon()
      this.startProviderPingCycle()
    }, 800)
  }

  subscribe(fn: RuntimeEventListener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  processCommand(cmd: RuntimeCommand): void {
    this.emit('CONNECTION_STATUS', { status: 'syncing' })
    setTimeout(() => this.emit('CONNECTION_STATUS', { status: 'connected' }), 300)

    switch (cmd.type) {
      case 'TAKE_CONTROL':          this.cmdTakeControl(); break
      case 'RETURN_CONTROL':        this.cmdReturnControl(); break
      case 'PAUSE_SESSION':         this.cmdPause(); break
      case 'RESUME_SESSION':        this.cmdResume(); break
      case 'INJECT_INSTRUCTION':    this.cmdInjectInstruction(cmd.payload?.instruction as string); break
      case 'RUN_TERMINAL_COMMAND':  this.cmdRunTerminalCommand(cmd.payload?.command as string); break
      case 'RERUN_TESTS':           this.cmdRerunTests(); break
      case 'MOUNT_WORKSPACE':       this.cmdMountWorkspace(cmd.payload?.workspaceId as string, cmd.payload?.localPath as string); break
      case 'UNMOUNT_WORKSPACE':     this.cmdUnmountWorkspace(cmd.payload?.workspaceId as string); break
      case 'APPROVE_ESCALATION':    this.cmdResolveEscalation(cmd.payload?.escalationId as string, true); break
      case 'DENY_ESCALATION':       this.cmdResolveEscalation(cmd.payload?.escalationId as string, false); break
      case 'RESTART_DAEMON':        this.cmdRestartDaemon(); break
      case 'SIMULATE_ESCALATION':   this.cmdSimulateEscalation(); break
      case 'PING_PROVIDER':         this.cmdPingProvider(cmd.payload?.providerId as string); break
      case 'PING_ALL_PROVIDERS':    this.cmdPingAllProviders(); break
      case 'RUN_DIAGNOSTICS':       this.cmdRunDiagnostics(); break
      case 'SPAWN_SESSION':         this.cmdSpawnSession(cmd.payload?.config as SessionLaunchConfig); break
      case 'CREATE_WORKTREE':       this.cmdCreateWorktree(cmd.payload?.workspaceId as string, cmd.payload?.branch as string); break
      case 'RUN_REAL_COMMAND':      this.cmdRunRealCommand(cmd.payload?.command as string, cmd.payload?.worktreePath as string | undefined); break
      case 'GET_GIT_DIFF':          this.cmdGetGitDiff(cmd.payload?.worktreePath as string | undefined); break
    }
  }

  // ── Command handlers ──────────────────────────────────────────────────────

  private async cmdPingProvider(providerId: string): Promise<void> {
    this.emitLog('info', 'provider', `Pinging ${providerId}…`)
    const health = await providerRegistry.ping(providerId)
    if (!health) return
    this.emit('PROVIDER_HEALTH_UPDATED', { health })
    const stateMsg = health.state === 'connected'
      ? `connected — ${health.latencyMs}ms`
      : `${health.state}${health.errorMessage ? ` — ${health.errorMessage}` : ''}`
    this.emitLog(
      health.state === 'connected' ? 'info' : health.state === 'unreachable' ? 'error' : 'warn',
      'provider',
      `${health.name}: ${stateMsg}${health.discoveredModels.length ? ` (${health.discoveredModels.length} models)` : ''}`,
    )
    if (health.state !== 'connected' && health.state !== 'unconfigured') {
      this.emitNotification('warning', `${health.name} ${health.state}`, health.errorMessage)
    }
  }

  private async cmdPingAllProviders(): Promise<void> {
    this.emitLog('info', 'runtime', 'Running provider diagnostics…')
    const results = await providerRegistry.pingAll()
    for (const health of await Promise.all(results)) {
      this.emit('PROVIDER_HEALTH_UPDATED', { health })
    }
    const connected = (await Promise.all(results)).filter(h => h.state === 'connected').length
    this.emitLog('info', 'runtime', `Provider sweep complete — ${connected}/${results.length} reachable`)
  }

  private cmdRunDiagnostics(): void {
    this.emitLog('info', 'daemon', 'Running full runtime diagnostics…')
    this.cmdPingAllProviders()
    setTimeout(() => this.emitLog('info', 'daemon', 'Diagnostics complete'), 5000)
  }

  private cmdTakeControl(): void {
    this.emit('PHASE_CHANGED', { phase: 'human_controlled' })
    this.emit('HUMAN_TOOK_CONTROL')
    this.emitTrace({ id: `tak-${Date.now()}`, type: 'human_takeover', actor: 'human', timestamp: ts(), label: 'Human took control', success: true })
  }

  private cmdReturnControl(): void {
    this.emit('PHASE_CHANGED', { phase: 'autonomous_running' })
    this.emit('HUMAN_RETURNED_CONTROL')
    this.emitTrace({ id: `ret-${Date.now()}`, type: 'human_return', actor: 'human', timestamp: ts(), label: 'Returned to agent', success: true })
  }

  private cmdPause(): void {
    this.emit('SESSION_PAUSED')
    this.emit('PHASE_CHANGED', { phase: 'paused' })
    this.emitTrace({ id: `pse-${Date.now()}`, type: 'system_event', actor: 'system', timestamp: ts(), label: 'Session paused', success: true })
    this.emitNotification('warning', 'Session paused', 'Agent execution is suspended.')
    this.emitLog('info', 'runtime', 'Session paused by operator')
  }

  private cmdResume(): void {
    this.emit('SESSION_RESUMED')
    this.emit('PHASE_CHANGED', { phase: 'autonomous_running' })
    this.emitTrace({ id: `rsm-${Date.now()}`, type: 'system_event', actor: 'system', timestamp: ts(), label: 'Session resumed', success: true })
    this.emitNotification('info', 'Session resumed', 'Agent is running autonomously.')
    this.emitLog('info', 'runtime', 'Session resumed — agent running autonomously')
  }

  private cmdInjectInstruction(instruction: string): void {
    this.emit('PHASE_CHANGED', { phase: 'agent_replanning' })
    this.emitTrace({ id: `inj-${Date.now()}`, type: 'human_instruction', actor: 'human', timestamp: ts(), label: 'Injected instruction', detail: instruction, success: true })
    this.emitLog('info', 'agent', `Instruction injected — replanning: "${instruction.slice(0, 60)}"${instruction.length > 60 ? '…' : ''}`)

    setTimeout(() => {
      this.emitTrace({ id: `ack-${Date.now()}`, type: 'agent_acknowledged', actor: 'agent', timestamp: ts(), label: 'Agent acknowledged — replanning patch', success: true })
    }, 1200)

    setTimeout(() => {
      this.emitTrace({ id: `rpl-${Date.now()}`, type: 'agent_replanned', actor: 'agent', timestamp: ts(), label: 'Patch replanned', detail: instruction.slice(0, 80), success: true })
      this.emit('PHASE_CHANGED', { phase: 'patch_updating' })
    }, 2800)

    setTimeout(() => {
      this.emit('PATCH_UPDATED')
      this.emitTrace({ id: `ptch-${Date.now()}`, type: 'patch_updated', actor: 'agent', timestamp: ts(), label: 'Patch updated to v2', success: true })
      this.emit('TEST_RUN_STARTED')
      this.emit('PHASE_CHANGED', { phase: 'tests_rerunning' })
    }, 4200)

    setTimeout(() => {
      this.emitTrace({ id: `tst-${Date.now()}`, type: 'run_tests', actor: 'agent', timestamp: ts(), label: '97 tests passed', durationMs: 2341, success: true, tokenCount: 890 })
      this.emit('TEST_RUN_COMPLETE', { passed: true })
      this.emit('PHASE_CHANGED', { phase: 'ready_for_review' })
      this.emit('TERMINAL_APPENDED', { lines: interventionTerminalLines })
      this.emitNotification('success', 'Tests passed', '97 tests passing after patch update.')
    }, 6800)

    setTimeout(() => {
      this.emitTrace({ id: `rvw-${Date.now()}`, type: 'review_refreshed', actor: 'system', timestamp: ts(), label: 'Review package refreshed', success: true })
      this.emit('REVIEW_REFRESHED', { note: updatedCompletionNote })
      this.emitNotification('success', 'Review ready', 'Agent has a fresh review package waiting.')
      this.emitLog('info', 'agent', 'Review package refreshed — ready for human review')
    }, 7600)
  }

  private cmdRunTerminalCommand(command: string): void {
    const { risk, reason } = classifyCommand(command)

    if (risk === 'blocked') {
      const escalation: PermissionEscalation = {
        id: `esc-${Date.now()}`,
        agentId: 'human',
        agentName: 'Human operator',
        workspaceId: 'ws-active',
        workspaceName: this.activeWorktreePath?.split('/').pop() ?? 'workspace',
        command,
        riskLevel: 'critical',
        riskExplanation: reason ?? 'This command contains a pattern that is not permitted in this environment.',
        permissionId: 'p-shell-restricted',
        requestedAt: ts(),
      }
      this.pendingEscalation = escalation
      this.emit('PERMISSION_ESCALATION_REQUIRED', { escalation })
      this.emitLog('warn', 'runtime', `Blocked command: "${command}" — ${reason}`)
      return
    }

    if (risk === 'medium') {
      const escalation: PermissionEscalation = {
        id: `esc-${Date.now()}`,
        agentId: 'human',
        agentName: 'Human operator',
        workspaceId: 'ws-active',
        workspaceName: this.activeWorktreePath?.split('/').pop() ?? 'workspace',
        command,
        riskLevel: 'high',
        riskExplanation: reason ?? 'This command is not on the safe allowlist. Review before proceeding.',
        permissionId: 'p-shell-unknown',
        requestedAt: ts(),
      }
      this.pendingEscalation = escalation
      this.emit('PERMISSION_ESCALATION_REQUIRED', { escalation })
      this.emitLog('warn', 'runtime', `Unknown command requires approval: "${command}"`)
      return
    }

    // Safe — run it
    this.cmdRunRealCommand(command, this.activeWorktreePath ?? undefined)
  }

  private cmdRerunTests(): void {
    this.emit('TEST_RUN_STARTED')
    this.emit('PHASE_CHANGED', { phase: 'tests_rerunning' })
    setTimeout(() => {
      this.emitTrace({ id: `rtst-${Date.now()}`, type: 'run_tests', actor: 'agent', timestamp: ts(), label: 'Tests rerun — all passing', durationMs: 1240, success: true })
      this.emit('TEST_RUN_COMPLETE', { passed: true })
      this.emit('PHASE_CHANGED', { phase: 'ready_for_review' })
    }, 3000)
  }

  private cmdMountWorkspace(workspaceId: string, localPath: string): void {
    this.emitNotification('info', 'Mounting workspace', `Attaching ${localPath} to runtime...`)
    this.emitLog('info', 'workspace', `Mounting ${localPath}…`)
    this.emit('WORKSPACE_MOUNTED', { workspaceId, localPath, mountState: 'mounting' })
    setTimeout(() => {
      this.emit('WORKSPACE_MOUNTED', { workspaceId, localPath, mountState: 'mounted' })
      this.emitNotification('success', 'Workspace mounted', `${localPath.split('/').pop()} is ready.`)
      this.emitLog('info', 'workspace', `Mounted ${localPath} — filesystem ✓ terminal ✓`)
      this.activeRepoPath = localPath
      setRepoPath(localPath)
      executionCoordinator.notifyRepoPath(localPath)
    }, 1800)
  }

  private cmdUnmountWorkspace(workspaceId: string): void {
    this.emit('WORKSPACE_UNMOUNTED', { workspaceId })
    this.emitNotification('info', 'Workspace unmounted', 'Workspace detached from runtime.')
  }

  private cmdResolveEscalation(escalationId: string, approved: boolean): void {
    const pending = this.pendingEscalation
    this.emit('PERMISSION_ESCALATION_RESOLVED', { escalationId, approved })
    if (approved) {
      this.emitNotification('warning', 'Permission granted', 'Agent will proceed with the elevated operation.')
      this.emitTrace({ id: `esc-${Date.now()}`, type: 'system_event', actor: 'human', timestamp: ts(), label: 'Escalation approved — proceeding', success: true })
      if (pending?.id === escalationId && pending.command) {
        void this.cmdRunRealCommand(pending.command, this.activeWorktreePath ?? undefined)
      }
    } else {
      this.emitNotification('info', 'Permission denied', 'Agent will continue without the elevated operation.')
      this.emitTrace({ id: `esc-${Date.now()}`, type: 'system_event', actor: 'human', timestamp: ts(), label: 'Escalation denied — operation skipped', success: true })
    }
    if (pending?.id === escalationId) {
      this.pendingEscalation = null
    }
  }

  private cmdRestartDaemon(): void {
    this.emit('CONNECTION_STATUS', { status: 'connecting' })
    this.emitNotification('warning', 'Daemon restarting', 'Runtime will reconnect shortly.')
    this.emitLog('warn', 'daemon', 'Daemon restart requested — shutting down…')
    runtimeDaemon.simulateReconnect()
    setTimeout(() => {
      this.emit('CONNECTION_STATUS', { status: 'connected' })
      this.emitNotification('success', 'Daemon reconnected', 'All sessions restored.')
      this.emitLog('info', 'daemon', 'Daemon restarted and reconnected — sessions restored')
    }, 2400)
  }

  private cmdSimulateEscalation(): void {
    const escalation: PermissionEscalation = {
      id: `esc-${Date.now()}`,
      agentId: 'agent-001',
      agentName: 'Cipher',
      workspaceId: 'ws-001',
      workspaceName: 'boilerbyte',
      command: 'rm -rf node_modules && npm install',
      riskLevel: 'critical',
      riskExplanation: 'This command will permanently delete node_modules and reinstall all packages from the registry. It triggers network access and modifies the filesystem beyond the worktree boundary.',
      permissionId: 'p-shell',
      requestedAt: ts(),
    }
    this.emit('PERMISSION_ESCALATION_REQUIRED', { escalation })
  }

  private async cmdCreateWorktree(workspaceId: string, branch: string): Promise<void> {
    const worktreeName = branch.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40)
    const worktree: LiveWorktree = {
      id: `wt-live-${Date.now()}`,
      workspaceId,
      workspaceName: workspaceId,
      branch,
      providerId: 'anthropic',
      status: 'creating',
      createdAt: ts(),
      patchState: 'draft',
      openReviews: 0,
    }
    this.emit('WORKTREE_CREATED', { worktree })
    this.emitLog('info', 'workspace', `Creating worktree for branch: ${branch}`)

    try {
      const bridge = await getDesktopBridge()
      const repoPath = this.activeRepoPath ?? workspaceId
      const result = await bridge.createWorktree(repoPath, branch, worktreeName)

      if (!result.success) {
        this.emit('WORKTREE_FAILED', { workspaceId, branch, error: result.error })
        this.emitLog('error', 'workspace', `Worktree creation failed: ${result.error}`)
        this.emitNotification('error', 'Worktree failed', result.error ?? 'Unknown error')
        return
      }

      const worktreePath = result.worktreePath
      if (worktreePath) this.activeWorktreePath = worktreePath

      const active: LiveWorktree = {
        ...worktree,
        status: 'active',
        // @ts-ignore — worktreePath is extra metadata not in the type yet
        worktreePath,
      }
      this.emit('WORKTREE_CREATED', { worktree: active })
      this.emitLog('info', 'workspace', `Worktree ready — ${branch}${worktreePath ? ` at ${worktreePath}` : ''}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      this.emit('WORKTREE_FAILED', { workspaceId, branch, error: msg })
      this.emitLog('error', 'workspace', `Worktree creation failed: ${msg}`)
    }
  }

  private async cmdRunRealCommand(command: string, worktreePath?: string): Promise<void> {
    const path = worktreePath ?? this.activeWorktreePath
    const isDesktop = getEnvironment() === 'tauri'

    this.emit('COMMAND_STARTED', { command, worktreePath: path })
    this.emitTrace({ id: `cmd-${Date.now()}`, type: 'run_command', actor: 'human', timestamp: ts(), label: `$ ${command}`, success: true })
    this.emit('TERMINAL_APPENDED', { lines: [`$ ${command}`] })

    try {
      const bridge = await getDesktopBridge()
      const result = await bridge.runWorkspaceCommand(path ?? '.', command)

      if (result.blocked) {
        this.emit('TERMINAL_APPENDED', { lines: [`[blocked: ${result.blockReason}]`] })
        this.emitLog('warn', 'runtime', `Command blocked by runtime policy: ${command}`)
        return
      }

      // Stream stdout line by line with micro-delays
      const outputLines = result.stdout.split('\n').filter((_, i, arr) =>
        !(i === arr.length - 1 && arr[i] === '')
      )
      if (outputLines.length > 0) {
        this.emit('TERMINAL_APPENDED', { lines: outputLines })
      }
      if (result.stderr) {
        const errLines = result.stderr.split('\n').filter(Boolean).map(l => `[stderr] ${l}`)
        this.emit('TERMINAL_APPENDED', { lines: errLines })
      }

      this.emit('COMMAND_COMPLETED', { command, exitCode: result.exitCode, durationMs: result.durationMs })
      this.emitLog(
        result.exitCode === 0 ? 'info' : 'warn',
        'runtime',
        `Command "${command}" exited ${result.exitCode} in ${result.durationMs}ms${isDesktop ? '' : ' (simulated)'}`,
      )

      // Trigger test-run UI if it was a test command
      if (command.startsWith('npm test') || command.startsWith('npm run test') || command.startsWith('pnpm test') || command.startsWith('yarn test')) {
        this.emit('TEST_RUN_STARTED')
        setTimeout(() => {
          this.emit('TEST_RUN_COMPLETE', { passed: result.exitCode === 0 })
        }, 200)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Command execution failed'
      this.emit('TERMINAL_APPENDED', { lines: [`[error] ${msg}`] })
      this.emitLog('error', 'runtime', `Command failed: ${msg}`)
    }
  }

  private async cmdGetGitDiff(worktreePath?: string): Promise<void> {
    const path = worktreePath ?? this.activeWorktreePath
    if (!path) {
      this.emitLog('warn', 'runtime', 'No active worktree — cannot read diff')
      return
    }
    try {
      const bridge = await getDesktopBridge()
      const result = await bridge.getGitDiff(path)
      this.emit('GIT_DIFF_UPDATED', { diff: result.rawDiff, changedFiles: result.changedFiles, insertions: result.insertions, deletions: result.deletions })
      this.emitLog('info', 'runtime', `Git diff read — ${result.changedFiles.length} files, +${result.insertions}/-${result.deletions}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to read diff'
      this.emitLog('error', 'runtime', `git diff failed: ${msg}`)
    }
  }

  private async cmdSpawnSession(config: SessionLaunchConfig): Promise<void> {
    const worktreeId = `wt-${Date.now()}`
    const isDesktop = getEnvironment() === 'tauri'
    this.emitLog('info', 'runtime', `Spawning session: ${config.branchName} on ${config.workspaceName}`)

    // Track repo path for subsequent commands
    if (config.rootPath) this.activeRepoPath = config.rootPath

    // Step 1: validate workspace
    await new Promise(r => setTimeout(r, 200))
    this.emitLog('debug', 'workspace', `Workspace validated: ${config.rootPath}`)

    // Step 2: create worktree (real in Tauri, simulated in browser)
    const worktreeCreating: LiveWorktree = {
      id: worktreeId,
      workspaceId: config.workspaceId,
      workspaceName: config.workspaceName,
      branch: config.branchName,
      agentId: config.agentId,
      agentName: config.agentName,
      providerId: config.providerId,
      status: 'creating',
      createdAt: ts(),
      patchState: 'draft',
      openReviews: 0,
    }
    this.emit('WORKTREE_CREATED', { worktree: worktreeCreating })

    let realWorktreePath: string | null = null
    try {
      const bridge = await getDesktopBridge()
      const worktreeName = config.branchName.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40)
      const result = await bridge.createWorktree(config.rootPath, config.branchName, worktreeName)

      if (!result.success) {
        this.emit('WORKTREE_FAILED', { workspaceId: config.workspaceId, branch: config.branchName, error: result.error })
        this.emit('SESSION_LAUNCH_FAILED', { config, step: 'worktree', error: result.error })
        this.emitLog('error', 'workspace', `Worktree creation failed: ${result.error}`)
        this.emitNotification('error', 'Session failed', result.error ?? 'Worktree creation failed')
        return
      }

      realWorktreePath = result.worktreePath
      if (realWorktreePath) this.activeWorktreePath = realWorktreePath
      this.emitLog('info', 'workspace', `Worktree created${isDesktop ? ` at ${realWorktreePath}` : ''} — branch: ${config.branchName}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Worktree creation failed'
      this.emit('WORKTREE_FAILED', { workspaceId: config.workspaceId, branch: config.branchName, error: msg })
      this.emit('SESSION_LAUNCH_FAILED', { config, step: 'worktree', error: msg })
      this.emitLog('error', 'workspace', msg)
      this.emitNotification('error', 'Session failed', msg)
      return
    }

    // Step 3: mount runtime
    await new Promise(r => setTimeout(r, 700))
    this.emitLog('info', 'daemon', `Runtime mounted for ${config.workspaceName}`)

    // Step 4: attach provider
    await new Promise(r => setTimeout(r, 600))
    this.emitLog('info', 'provider', `Provider attached — ${config.providerName} / ${config.modelId}`)

    // Step 5: load agent (simulation — no real agent yet)
    await new Promise(r => setTimeout(r, 500))
    this.emitLog('info', 'agent', `Agent ${config.agentName} loaded${isDesktop ? '' : ' (simulated)'}`)

    // Step 6: session live
    await new Promise(r => setTimeout(r, 300))
    const worktreeActive: LiveWorktree = {
      id: worktreeId,
      workspaceId: config.workspaceId,
      workspaceName: config.workspaceName,
      branch: config.branchName,
      agentId: config.agentId,
      agentName: config.agentName,
      providerId: config.providerId,
      status: 'active',
      createdAt: ts(),
      patchState: 'draft',
      openReviews: 0,
    }
    const patch: PatchLifecycle = {
      sessionId: `sess-${Date.now()}`,
      workspaceId: config.workspaceId,
      workspaceName: config.workspaceName,
      branch: config.branchName,
      worktreeId,
      version: 1,
      state: 'draft',
      filesChanged: [],
      testsPassed: 0,
      testsFailed: 0,
      interventionCount: 0,
      providerId: config.providerId,
      agentName: config.agentName,
      executionDurationMs: 0,
      tokensUsed: 0,
      costUsd: 0,
      updatedAt: ts(),
    }
    this.emit('WORKTREE_CREATED', { worktree: worktreeActive })
    this.emit('SESSION_SPAWNED', { config, worktreePath: realWorktreePath })
    this.emit('PATCH_LIFECYCLE_CHANGED', { patch })
    this.emitNotification('success', 'Session live', `${config.agentName} is running on ${config.branchName}${isDesktop ? '' : ' (simulated)'}`)
    this.emitLog('info', 'runtime', `Session initialized — ${config.agentName} on ${config.branchName}`)
    this.emit('PHASE_CHANGED', { phase: 'autonomous_running' })
  }

  // ── Daemon bridge ─────────────────────────────────────────────────────────

  private bridgeDaemon(): void {
    runtimeDaemon.subscribe(state => {
      this.emit('DAEMON_STATUS_CHANGED', { daemonState: state })
    })
    // Emit initial state
    this.emit('DAEMON_STATUS_CHANGED', { daemonState: runtimeDaemon.getState() })
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private emit(type: RuntimeEventType, payload?: Record<string, unknown>): void {
    const event: RuntimeEvent = {
      id: `${type.toLowerCase().replace(/_/g, '-')}-${++this.seq}`,
      type,
      timestamp: ts(),
      sequenceId: this.seq,
      payload,
    }
    this.listeners.forEach(fn => fn(event))
  }

  private emitTrace(traceEvent: Record<string, unknown>): void {
    this.emit('TRACE_EVENT', { traceEvent })
  }

  private emitNotification(type: string, title: string, message?: string): void {
    this.emit('NOTIFICATION_ADDED', {
      notification: { id: `notif-${Date.now()}`, type, title, message, timestamp: ts() },
    })
  }

  private emitLog(level: LogLevel, source: LogSource, message: string): void {
    this.emit('RUNTIME_LOG', {
      log: { id: `log-${++this.seq}`, level, source, message, timestamp: ts() },
    })
  }

  private startHeartbeat(): void {
    let tick = 0
    setInterval(() => {
      this.emit('HEARTBEAT', { tick: Date.now() })
      tick++
      // Emit a runtime log every ~20s (every 5 heartbeats)
      if (tick % 5 === 0) {
        this.emitLog('debug', 'runtime', `Heartbeat #${tick} — 1 session active`)
      }
    }, 4000)
  }

  private startProviderPingCycle(): void {
    // Initial probe after boot
    setTimeout(() => this.cmdPingAllProviders(), 1500)
    // Then every 60 seconds
    setInterval(() => this.cmdPingAllProviders(), 60000)
  }
}

export const runtimeEngine = new RuntimeEngine()
