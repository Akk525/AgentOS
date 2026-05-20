// WorkspaceValidator validates local paths before mounting.
// In Tauri mode: delegates to Rust via desktopBridge (real .git detection).
// In browser mode: desktopBridge falls back to WebBridge (heuristic simulation).

import { getDesktopBridge } from './desktop/desktopBridge'
import type { RepoValidationResult } from '../types'

function parsePath(raw: string): string {
  return raw.trim().replace(/\\/g, '/')
}

function isValidPathFormat(path: string): boolean {
  return path.startsWith('/') || path.startsWith('~/')
}

export interface WorkspaceValidator {
  validate(path: string): Promise<RepoValidationResult>
  quickCheck(path: string): RepoValidationResult
}

class WorkspaceValidatorImpl implements WorkspaceValidator {
  quickCheck(rawPath: string): RepoValidationResult {
    const path = parsePath(rawPath)
    if (!path) return { path, state: 'idle', message: 'Enter a path to validate' }
    if (!isValidPathFormat(path)) {
      return { path, state: 'invalid_path', message: 'Path must be absolute (/…) or home-relative (~/)' }
    }
    return { path, state: 'checking', message: 'Checking repository…' }
  }

  async validate(rawPath: string): Promise<RepoValidationResult> {
    const path = parsePath(rawPath)

    if (!path) return { path, state: 'idle', message: 'Enter a path to validate' }
    if (!isValidPathFormat(path)) {
      return { path, state: 'invalid_path', message: 'Path must be absolute (/…) or home-relative (~/)' }
    }

    try {
      const bridge = await getDesktopBridge()
      const info = await bridge.validateRepo(path)

      if (!info.hasGit) {
        return { path, state: 'no_git', message: 'No .git directory found — not a git repository' }
      }

      return {
        path,
        state: 'valid_git',
        message: 'Git repository detected',
        branch:        info.branch ?? 'main',
        isDirty:       info.isDirty,
        untrackedCount: info.untrackedCount,
      }
    } catch {
      return { path, state: 'invalid_path', message: 'Could not read path' }
    }
  }
}

export const workspaceValidator: WorkspaceValidator = new WorkspaceValidatorImpl()
