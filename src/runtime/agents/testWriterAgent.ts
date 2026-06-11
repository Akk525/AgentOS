import type { GraphNode, Project } from '../../types/graph'
import { getDesktopBridge } from '../desktop/desktopBridge'
import { persistTestFailure, persistTesterResult } from '../execution/persistExecution'
import { resolveUpstreamWorktree } from '../graphWorktree'
import { getLocalStore } from '../store'
import { taskGraphEngine } from '../taskGraphEngine'
import { parseTestOutput } from '../testOutputParser'

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const DEFAULT_TEST_COMMAND = 'npm test'

export interface RunTestWriterOptions {
  repoPath: string
}

export async function runTestWriterForNode(
  node: GraphNode,
  project: Project,
  _options: RunTestWriterOptions,
): Promise<void> {
  const sessionId = node.assignedSessionId ?? uid('sess')
  const graphState = taskGraphEngine.getState()
  const { nodes, edges } = graphState

  await taskGraphEngine.transitionNode(
    node.id,
    'assigned',
    { assignedAgentName: 'Test Writer' },
    { assignedSessionId: sessionId },
  )

  await getLocalStore().appendEvent({
    projectId: project.id,
    nodeId: node.id,
    sessionId,
    type: 'session_started',
    message: `Test writer started: ${node.title}`,
    severity: 'info',
    payload: { agentName: 'Test Writer' },
  })

  await taskGraphEngine.transitionNode(node.id, 'running')

  const meta = node.metadata as Record<string, unknown>
  const testCommand = (meta.testCommand as string | undefined) ?? DEFAULT_TEST_COMMAND
  const { worktreePath, branchName, sourceNode } = resolveUpstreamWorktree(node, nodes, edges)

  const { applySkillsForNode } = await import('../skills/applySkillsForNode')
  await applySkillsForNode({
    node,
    project,
    worktreePath,
    agentRole: 'test-writer',
    providerId: meta.provider as string | undefined,
    modelId: meta.model as string | undefined,
    sessionId,
  })

  const bridge = await getDesktopBridge()
  const cmdResult = await bridge.runWorkspaceCommand(worktreePath, testCommand)

  const terminalOutput: string[] = [
    `Worktree: ${worktreePath}`,
    `Branch: ${branchName} (from ${sourceNode.title})`,
    `$ ${testCommand}`,
    cmdResult.stdout || cmdResult.stderr || `(exit ${cmdResult.exitCode})`,
  ]

  if (cmdResult.blocked && cmdResult.blockReason) {
    throw new Error(`Command blocked: ${cmdResult.blockReason}`)
  }

  const parsed = parseTestOutput(
    cmdResult.stdout,
    cmdResult.stderr,
    cmdResult.exitCode,
  )

  const freshNode = taskGraphEngine.getState().nodes.find(n => n.id === node.id) ?? node
  const freshGraph = taskGraphEngine.getState()

  if (parsed.success) {
    await persistTesterResult({
      node: freshNode,
      project,
      sessionId,
      parsed,
      terminalOutput,
      testCommand,
    })
  } else {
    await persistTestFailure({
      node: freshNode,
      project,
      sessionId,
      parsed,
      terminalOutput,
      testCommand,
      nodes: freshGraph.nodes,
      edges: freshGraph.edges,
    })
  }
}
