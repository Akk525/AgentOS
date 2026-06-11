// Tauri bridge — only loaded when window.__TAURI__ is detected.
// All imports are dynamic so this file never affects the browser bundle.

import type {
  DesktopBridge, DirectoryPickResult, RepoInfo, PlatformInfo,
  WorktreeCreateResult, CommandResult, GitDiffResult,
  WorkspaceFileWrite, WriteWorkspaceFilesResult,
  MergeWorktreeResult, RemoveWorktreeResult,
} from './desktopTypes'

class TauriBridge implements DesktopBridge {
  readonly environment = 'tauri' as const

  async pickDirectory(): Promise<DirectoryPickResult> {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const selected = await open({ directory: true, multiple: false, title: 'Select repository' })
    if (selected === null || Array.isArray(selected)) return { cancelled: true, path: null }
    return { cancelled: false, path: selected as string }
  }

  async validateRepo(path: string): Promise<RepoInfo> {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<RepoInfo>('validate_repo', { path })
  }

  async getPlatform(): Promise<PlatformInfo> {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<PlatformInfo>('get_platform')
  }

  async createWorktree(repoPath: string, branchName: string, worktreeName: string): Promise<WorktreeCreateResult> {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<WorktreeCreateResult>('create_worktree', { repoPath, branchName, worktreeName })
  }

  async runWorkspaceCommand(worktreePath: string, command: string): Promise<CommandResult> {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<CommandResult>('run_workspace_command', { worktreePath, command })
  }

  async getGitDiff(worktreePath: string): Promise<GitDiffResult> {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<GitDiffResult>('get_git_diff', { worktreePath })
  }

  async writeWorkspaceFiles(
    worktreePath: string,
    files: WorkspaceFileWrite[],
  ): Promise<WriteWorkspaceFilesResult> {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<WriteWorkspaceFilesResult>('write_workspace_files', { worktreePath, files })
  }

  async mergeWorktree(
    repoPath: string,
    branchName: string,
    targetBranch = 'main',
  ): Promise<MergeWorktreeResult> {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<MergeWorktreeResult>('merge_worktree', { repoPath, branchName, targetBranch })
  }

  async removeWorktree(
    repoPath: string,
    worktreePath: string,
    branchName?: string,
  ): Promise<RemoveWorktreeResult> {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<RemoveWorktreeResult>('remove_worktree', { repoPath, worktreePath, branchName })
  }
}

export const tauriBridge = new TauriBridge()
