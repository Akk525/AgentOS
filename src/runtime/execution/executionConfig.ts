const REPO_PATH_KEY = 'agentos.repoPath'
const AUTO_RUN_KEY = 'agentos.autoRun'

export function getRepoPath(): string | null {
  try {
    return localStorage.getItem(REPO_PATH_KEY)
  } catch {
    return null
  }
}

export function setRepoPath(path: string | null): void {
  try {
    if (path) localStorage.setItem(REPO_PATH_KEY, path)
    else localStorage.removeItem(REPO_PATH_KEY)
  } catch {
    // ignore
  }
}

export function getAutoRunEnabled(): boolean {
  try {
    const v = localStorage.getItem(AUTO_RUN_KEY)
    return v === null ? true : v === '1'
  } catch {
    return true
  }
}

export function setAutoRunEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_RUN_KEY, enabled ? '1' : '0')
  } catch {
    // ignore
  }
}
