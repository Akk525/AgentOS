export type DesktopEnvironment = 'tauri' | 'web'

export interface RepoInfo {
  path: string
  hasGit: boolean
  branch: string | null
  isDirty: boolean
  untrackedCount: number
  remoteUrl: string | null
}

export interface DirectoryPickResult {
  cancelled: boolean
  path: string | null
}

export interface PlatformInfo {
  os: 'macos' | 'windows' | 'linux'
  arch: string
  appVersion: string
}

export interface WorktreeCreateResult {
  success: boolean
  worktreePath: string | null
  branchName: string
  stdout: string
  stderr: string
  error: string | null
}

export interface CommandResult {
  exitCode: number
  stdout: string
  stderr: string
  durationMs: number
  blocked: boolean
  blockReason: string | null
}

export interface GitDiffResult {
  rawDiff: string
  changedFiles: string[]
  insertions: number
  deletions: number
}

export interface DesktopBridge {
  environment: DesktopEnvironment
  pickDirectory(): Promise<DirectoryPickResult>
  validateRepo(path: string): Promise<RepoInfo>
  getPlatform(): Promise<PlatformInfo>
  createWorktree(repoPath: string, branchName: string, worktreeName: string): Promise<WorktreeCreateResult>
  runWorkspaceCommand(worktreePath: string, command: string): Promise<CommandResult>
  getGitDiff(worktreePath: string): Promise<GitDiffResult>
}
