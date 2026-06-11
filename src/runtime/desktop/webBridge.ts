// Browser fallback — safe deterministic responses.
// Never reads from the real filesystem; no Tauri APIs available here.

import type {
  DesktopBridge, DirectoryPickResult, RepoInfo, PlatformInfo,
  WorktreeCreateResult, CommandResult, GitDiffResult,
  WorkspaceFileWrite, WriteWorkspaceFilesResult,
} from './desktopTypes'

const KNOWN_REPOS: Record<string, Partial<RepoInfo>> = {
  boilerbyte:    { hasGit: true, branch: 'main',    isDirty: false, untrackedCount: 0 },
  clauseguard:   { hasGit: true, branch: 'main',    isDirty: true,  untrackedCount: 2 },
  'formula-os':  { hasGit: true, branch: 'develop', isDirty: false, untrackedCount: 0 },
  'quant-bot':   { hasGit: true, branch: 'main',    isDirty: false, untrackedCount: 1 },
  'new-project': { hasGit: false, branch: null,     isDirty: false, untrackedCount: 0 },
}

function extractRepoName(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? ''
}

const MOCK_DIFF = `diff --git a/src/auth/session.ts b/src/auth/session.ts
index a3f1c4d..b2e8f1a 100644
--- a/src/auth/session.ts
+++ b/src/auth/session.ts
@@ -12,7 +12,9 @@ export async function getSession(token: string) {
   if (!token) return null
-  const session = await db.sessions.findOne({ token })
-  return session
+  const session = await db.sessions.findOne({ token, active: true })
+  if (!session) return null
+  await db.sessions.updateOne({ token }, { lastAccessedAt: new Date() })
+  return session
 }`

class WebBridge implements DesktopBridge {
  readonly environment = 'web' as const

  async pickDirectory(): Promise<DirectoryPickResult> {
    return { cancelled: true, path: null }
  }

  async validateRepo(path: string): Promise<RepoInfo> {
    await new Promise(r => setTimeout(r, 400 + Math.random() * 300))
    const repoName = extractRepoName(path)
    const known = KNOWN_REPOS[repoName]
    if (known) {
      return {
        path,
        hasGit:         known.hasGit ?? false,
        branch:         known.branch ?? null,
        isDirty:        known.isDirty ?? false,
        untrackedCount: known.untrackedCount ?? 0,
        remoteUrl:      null,
      }
    }
    const looksLikeProject = /\/(projects|dev|code|src)\//i.test(path)
    const hasGit = looksLikeProject ? Math.random() > 0.3 : Math.random() > 0.7
    return { path, hasGit, branch: hasGit ? 'main' : null, isDirty: false, untrackedCount: 0, remoteUrl: null }
  }

  async getPlatform(): Promise<PlatformInfo> {
    return { os: 'macos', arch: 'unknown', appVersion: 'web-preview' }
  }

  async createWorktree(repoPath: string, branchName: string, worktreeName: string): Promise<WorktreeCreateResult> {
    await new Promise(r => setTimeout(r, 800 + Math.random() * 400))
    const worktreePath = `${repoPath}/.agentos/worktrees/${worktreeName}`
    return {
      success: true,
      worktreePath,
      branchName,
      stdout: `Preparing worktree (new branch '${branchName}')\nHEAD is now at abc1234`,
      stderr: '',
      error: null,
    }
  }

  async runWorkspaceCommand(_worktreePath: string, command: string): Promise<CommandResult> {
    await new Promise(r => setTimeout(r, 600 + Math.random() * 1200))

    if (command.startsWith('git status')) {
      return {
        exitCode: 0,
        stdout: `On branch main\nnothing to commit, working tree clean\n`,
        stderr: '',
        durationMs: 42,
        blocked: false,
        blockReason: null,
      }
    }

    if (command.startsWith('git diff')) {
      return {
        exitCode: 0,
        stdout: MOCK_DIFF,
        stderr: '',
        durationMs: 38,
        blocked: false,
        blockReason: null,
      }
    }

    if (command.startsWith('ls')) {
      return {
        exitCode: 0,
        stdout: `package.json\nsrc/\nnode_modules/\nREADME.md\ntsconfig.json\n`,
        stderr: '',
        durationMs: 12,
        blocked: false,
        blockReason: null,
      }
    }

    if (command.startsWith('npm test') || command.startsWith('npm run test')) {
      return {
        exitCode: 0,
        stdout: [
          '',
          '> agentos@2.0.0 test',
          '> jest --coverage',
          '',
          'PASS src/auth/session.test.ts',
          '  ✓ returns null for missing token (8ms)',
          '  ✓ returns null for expired session (4ms)',
          '  ✓ updates lastAccessedAt on valid session (12ms)',
          '',
          'Test Suites: 1 passed, 1 total',
          'Tests:       3 passed, 3 total',
          'Time:        1.243s',
          '',
        ].join('\n'),
        stderr: '',
        durationMs: 1243,
        blocked: false,
        blockReason: null,
      }
    }

    return {
      exitCode: 0,
      stdout: `[simulated output for: ${command}]\n`,
      stderr: '',
      durationMs: 200,
      blocked: false,
      blockReason: null,
    }
  }

  async getGitDiff(_worktreePath: string): Promise<GitDiffResult> {
    await new Promise(r => setTimeout(r, 300))
    return {
      rawDiff: MOCK_DIFF,
      changedFiles: ['src/auth/session.ts'],
      insertions: 3,
      deletions: 2,
    }
  }

  async writeWorkspaceFiles(
    _worktreePath: string,
    files: WorkspaceFileWrite[],
  ): Promise<WriteWorkspaceFilesResult> {
    await new Promise(r => setTimeout(r, 200))
    return {
      success: true,
      filesWritten: files.length,
      error: null,
    }
  }
}

export const webBridge = new WebBridge()
