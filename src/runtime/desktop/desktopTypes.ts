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

export interface WorkspaceFileWrite {
  path: string
  content: string
}

export interface WriteWorkspaceFilesResult {
  success: boolean
  filesWritten: number
  error: string | null
}

export interface MergeWorktreeResult {
  success: boolean
  conflict: boolean
  stdout: string
  stderr: string
  error: string | null
}

export interface RemoveWorktreeResult {
  success: boolean
  stdout: string
  stderr: string
  error: string | null
}

export interface DiscoveredSkillFile {
  id: string
  scope: 'personal' | 'project' | 'bundled'
  sourcePath: string
  content: string
}

export interface ReadWorkspaceFileResult {
  success: boolean
  content: string
  path: string
  error: string | null
}

export interface SearchWorkspaceMatch {
  path: string
  line: number
  text: string
}

export interface SearchWorkspaceResult {
  success: boolean
  matches: SearchWorkspaceMatch[]
  error: string | null
}

export interface DesktopBridge {
  environment: DesktopEnvironment
  pickDirectory(): Promise<DirectoryPickResult>
  validateRepo(path: string): Promise<RepoInfo>
  getPlatform(): Promise<PlatformInfo>
  createWorktree(repoPath: string, branchName: string, worktreeName: string): Promise<WorktreeCreateResult>
  runWorkspaceCommand(worktreePath: string, command: string): Promise<CommandResult>
  getGitDiff(worktreePath: string): Promise<GitDiffResult>
  writeWorkspaceFiles(worktreePath: string, files: WorkspaceFileWrite[]): Promise<WriteWorkspaceFilesResult>
  mergeWorktree(repoPath: string, branchName: string, targetBranch?: string): Promise<MergeWorktreeResult>
  removeWorktree(repoPath: string, worktreePath: string, branchName?: string): Promise<RemoveWorktreeResult>
  discoverSkills(repoPath?: string): Promise<DiscoveredSkillFile[]>
  readWorkspaceFile(worktreePath: string, relPath: string): Promise<ReadWorkspaceFileResult>
  searchWorkspace(worktreePath: string, query: string, limit?: number): Promise<SearchWorkspaceResult>
}
