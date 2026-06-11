import type { GraphEdge, GraphNode, Project } from '../../types/graph'
import { findUpstreamNodeByRole } from '../graphWorktree'
import { getDesktopBridge } from '../desktop/desktopBridge'
import { getRepoPath } from './executionConfig'
import { getLocalStore } from '../store'
import { taskGraphEngine } from '../taskGraphEngine'

export interface MergeAfterApprovalInput {
  reviewerNode: GraphNode
  project: Project
  sessionId: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  targetBranch?: string
}

export type MergeAfterApprovalResult =
  | { outcome: 'merged'; branchName: string; targetBranch: string }
  | { outcome: 'conflict'; message: string }
  | { outcome: 'skipped'; reason: string }
  | { outcome: 'error'; message: string }

export async function mergeAfterApproval(
  input: MergeAfterApprovalInput,
): Promise<MergeAfterApprovalResult> {
  const { reviewerNode, project, sessionId, nodes, edges } = input
  const targetBranch = input.targetBranch ?? 'main'
  const repoPath = getRepoPath()

  if (!repoPath) {
    return { outcome: 'skipped', reason: 'No workspace mounted' }
  }

  const builderNode = findUpstreamNodeByRole(reviewerNode, nodes, edges, 'builder')
  if (!builderNode) {
    return { outcome: 'skipped', reason: 'No upstream builder node found' }
  }

  const meta = builderNode.metadata as Record<string, unknown>
  const worktreePath = meta.worktree as string | undefined
  const branchName = builderNode.branch

  if (!branchName) {
    return { outcome: 'error', message: 'Builder branch not set' }
  }

  const bridge = await getDesktopBridge()
  const mergeResult = await bridge.mergeWorktree(repoPath, branchName, targetBranch)

  if (mergeResult.conflict) {
    await getLocalStore().appendEvent({
      projectId: project.id,
      nodeId: reviewerNode.id,
      sessionId,
      type: 'merge_conflict',
      message: `Merge conflict merging ${branchName} into ${targetBranch}`,
      severity: 'error',
      payload: {
        agentName: 'Governance',
        branchName,
        targetBranch,
        stderr: mergeResult.stderr,
      },
    })

    await taskGraphEngine.transitionNode(reviewerNode.id, 'blocked', {
      mergeConflict: true,
      blockReason: 'Merge conflict — resolve manually',
      mergeTargetBranch: targetBranch,
    })

    if (builderNode) {
      await taskGraphEngine.updateNodeMetadata(builderNode.id, {
        mergeConflict: true,
      })
    }

    return { outcome: 'conflict', message: mergeResult.error ?? 'Merge conflict' }
  }

  if (!mergeResult.success) {
    return { outcome: 'error', message: mergeResult.error ?? 'Merge failed' }
  }

  if (worktreePath) {
    await bridge.removeWorktree(repoPath, worktreePath, branchName)
  }

  await taskGraphEngine.updateNodeMetadata(builderNode.id, {
    mergedAt: new Date().toISOString(),
    worktreeRemoved: true,
    mergeTargetBranch: targetBranch,
  })

  await getLocalStore().appendEvent({
    projectId: project.id,
    nodeId: reviewerNode.id,
    sessionId,
    type: 'merge_completed',
    message: `Merged ${branchName} into ${targetBranch}`,
    severity: 'success',
    payload: {
      agentName: 'Governance',
      branchName,
      targetBranch,
      builderNodeId: builderNode.id,
    },
  })

  return { outcome: 'merged', branchName, targetBranch }
}

export async function archiveWorktreeAfterReject(
  reviewerNode: GraphNode,
  project: Project,
  sessionId: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
): Promise<void> {
  const repoPath = getRepoPath()
  if (!repoPath) return

  const builderNode = findUpstreamNodeByRole(reviewerNode, nodes, edges, 'builder')
  if (!builderNode) return

  const meta = builderNode.metadata as Record<string, unknown>
  const worktreePath = meta.worktree as string | undefined
  const branchName = builderNode.branch ?? undefined

  if (!worktreePath) return

  const bridge = await getDesktopBridge()
  await bridge.removeWorktree(repoPath, worktreePath, branchName)

  await taskGraphEngine.updateNodeMetadata(builderNode.id, {
    worktreeRemoved: true,
    archivedAt: new Date().toISOString(),
  })

  await getLocalStore().appendEvent({
    projectId: project.id,
    nodeId: reviewerNode.id,
    sessionId,
    type: 'session_completed',
    message: `Worktree archived after review rejection`,
    severity: 'warning',
    payload: {
      agentName: 'Governance',
      builderNodeId: builderNode.id,
      branchName,
    },
  })
}
