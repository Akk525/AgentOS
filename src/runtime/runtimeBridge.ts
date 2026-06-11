// RuntimeBridge sits between the UI and the daemon/engine.
import { setRepoPath } from './execution/executionConfig'
import { executionCoordinator } from './executionCoordinator'

import type { WorkspaceMountStatus, MountState } from '../types'

type MountListener = (mounts: WorkspaceMountStatus[]) => void

class RuntimeBridge {
  private mounts = new Map<string, WorkspaceMountStatus>()
  private mountListeners = new Set<MountListener>()

  getMounts(): WorkspaceMountStatus[] {
    return Array.from(this.mounts.values())
  }

  subscribeMounts(fn: MountListener): () => void {
    this.mountListeners.add(fn)
    return () => this.mountListeners.delete(fn)
  }

  mountWorkspace(workspaceId: string, localPath: string, providerId: string): Promise<void> {
    return new Promise(resolve => {
      this.setMount(workspaceId, {
        workspaceId,
        localPath,
        mountState: 'mounting',
        filesystemAccess: false,
        terminalAvailable: false,
        sandboxStatus: 'unavailable',
        attachedProviderId: null,
      })

      // Simulate mount sequence
      setTimeout(() => {
        this.patchMount(workspaceId, { filesystemAccess: true })
      }, 600)
      setTimeout(() => {
        this.patchMount(workspaceId, { terminalAvailable: true })
      }, 1100)
      setTimeout(() => {
        this.patchMount(workspaceId, {
          mountState: 'mounted',
          sandboxStatus: 'healthy',
          attachedProviderId: providerId,
        })
        setRepoPath(localPath)
        executionCoordinator.notifyRepoPath(localPath)
        resolve()
      }, 1800)
    })
  }

  unmountWorkspace(workspaceId: string): Promise<void> {
    return new Promise(resolve => {
      this.patchMount(workspaceId, { mountState: 'unmounting' })
      setTimeout(() => {
        this.patchMount(workspaceId, {
          mountState: 'unmounted',
          filesystemAccess: false,
          terminalAvailable: false,
          sandboxStatus: 'unavailable',
          attachedProviderId: null,
        })
        resolve()
      }, 800)
    })
  }

  getMountState(workspaceId: string): MountState {
    return this.mounts.get(workspaceId)?.mountState ?? 'unmounted'
  }

  private setMount(workspaceId: string, status: WorkspaceMountStatus): void {
    this.mounts.set(workspaceId, status)
    this.notifyMountListeners()
  }

  private patchMount(workspaceId: string, partial: Partial<WorkspaceMountStatus>): void {
    const existing = this.mounts.get(workspaceId)
    if (!existing) return
    this.mounts.set(workspaceId, { ...existing, ...partial })
    this.notifyMountListeners()
  }

  private notifyMountListeners(): void {
    const mounts = this.getMounts()
    this.mountListeners.forEach(fn => fn(mounts))
  }
}

export const runtimeBridge = new RuntimeBridge()
