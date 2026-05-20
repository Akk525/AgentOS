// Factory that resolves the appropriate bridge for the current environment.
// UI and runtime layers must always go through this — never import tauriBridge directly.

import type { DesktopBridge, DesktopEnvironment } from './desktopTypes'

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

export function getEnvironment(): DesktopEnvironment {
  return isTauri() ? 'tauri' : 'web'
}

let _bridge: DesktopBridge | null = null

export async function getDesktopBridge(): Promise<DesktopBridge> {
  if (_bridge) return _bridge

  if (isTauri()) {
    const { tauriBridge } = await import('./tauriBridge')
    _bridge = tauriBridge
  } else {
    const { webBridge } = await import('./webBridge')
    _bridge = webBridge
  }

  return _bridge
}
