import type { GraphNode, Project } from '../../types/graph'
import { completeForRole } from '../inference/inferenceRuntime'
import { InferenceError } from '../inference/types'
import { getDesktopBridge } from '../desktop/desktopBridge'
import { parseRawDiff } from '../diffParser'
import { BUILDER_SYSTEM_PROMPT, parseBuilderOutput } from './builderSchema'
import { persistBuilderResult } from '../execution/persistExecution'
import { updateSessionData } from '../sessionStore'
import { getLocalStore } from '../store'
import { taskGraphEngine } from '../taskGraphEngine'

const REPAIR_PROMPT = 'Return only valid JSON matching the builder schema. No markdown, no commentary.'

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function buildUserPrompt(
  node: GraphNode,
  project: Project,
  worktreePath: string,
): string {
  const criteria = node.acceptanceCriteria.length > 0
    ? node.acceptanceCriteria.map(c => `- ${c}`).join('\n')
    : '- Complete the task as described'

  return `Project goal:
${project.goalText}

Task: ${node.title}
${node.description ? `Description: ${node.description}\n` : ''}
Acceptance criteria:
${criteria}

Worktree path: ${worktreePath}

Implement this task. Return JSON with file changes.`
}

export interface RunBuilderOptions {
  repoPath: string
  providerId?: string
  modelId?: string
}

export async function runBuilderForNode(
  node: GraphNode,
  project: Project,
  options: RunBuilderOptions,
): Promise<void> {
  const sessionId = node.assignedSessionId ?? uid('sess')
  const branchName = `agentos/task-${node.id.slice(0, 8)}`
  const worktreeName = branchName.replace(/\//g, '-')

  await taskGraphEngine.transitionNode(
    node.id,
    'assigned',
    { assignedAgentName: 'Builder' },
    { assignedSessionId: sessionId, branch: branchName },
  )

  await getLocalStore().appendEvent({
    projectId: project.id,
    nodeId: node.id,
    sessionId,
    type: 'session_started',
    message: `Builder started: ${node.title}`,
    severity: 'info',
    payload: { agentName: 'Builder', branch: branchName },
  })

  await taskGraphEngine.transitionNode(node.id, 'running')

  const bridge = await getDesktopBridge()
  const wtResult = await bridge.createWorktree(options.repoPath, branchName, worktreeName)
  if (!wtResult.success || !wtResult.worktreePath) {
    throw new Error(wtResult.error ?? 'Worktree creation failed')
  }

  const worktreePath = wtResult.worktreePath
  const meta = node.metadata as Record<string, unknown>
  const providerId = options.providerId ?? (meta.provider as string | undefined)
  const modelId = options.modelId ?? (meta.model as string | undefined)

  const userPrompt = buildUserPrompt(node, project, worktreePath)
  let result = await completeForRole(
    'builder',
    {
      messages: [
        { role: 'system', content: BUILDER_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      jsonMode: true,
      temperature: 0.2,
    },
    { providerId, modelId },
  )

  let output
  try {
    output = parseBuilderOutput(result.content)
  } catch (firstErr) {
    if (!(firstErr instanceof InferenceError) || firstErr.code !== 'invalid_plan') {
      throw firstErr
    }
    result = await completeForRole(
      'builder',
      {
        messages: [
          { role: 'system', content: BUILDER_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: result.content },
          { role: 'user', content: `${REPAIR_PROMPT}\n\nValidation error: ${firstErr.message}` },
        ],
        jsonMode: true,
        temperature: 0.1,
      },
      { providerId, modelId },
    )
    output = parseBuilderOutput(result.content)
  }

  const writeResult = await bridge.writeWorkspaceFiles(worktreePath, output.files)
  if (!writeResult.success) {
    throw new Error(writeResult.error ?? 'Failed to write files')
  }

  const terminalOutput: string[] = [
    `Worktree: ${worktreePath}`,
    `Wrote ${writeResult.filesWritten} file(s)`,
    ...output.files.map(f => `  → ${f.path}`),
  ]

  for (const cmd of output.commands ?? []) {
    const cmdResult = await bridge.runWorkspaceCommand(worktreePath, cmd)
    terminalOutput.push(
      `$ ${cmd}`,
      cmdResult.stdout || cmdResult.stderr || `(exit ${cmdResult.exitCode})`,
    )
    if (cmdResult.blocked && cmdResult.blockReason) {
      terminalOutput.push(`Blocked: ${cmdResult.blockReason}`)
    }
  }

  const diffResult = await bridge.getGitDiff(worktreePath)
  const diff = parseRawDiff(diffResult.rawDiff)

  await updateSessionData(project.id, node.id, {
    terminalOutput,
  })

  const freshNode = taskGraphEngine.getState().nodes.find(n => n.id === node.id) ?? node

  await persistBuilderResult({
    node: freshNode,
    project,
    sessionId,
    summary: output.summary,
    diff,
    terminalOutput,
    worktreePath,
    branchName,
    filesChanged: diffResult.changedFiles,
    linesAdded: diffResult.insertions,
    linesRemoved: diffResult.deletions,
    usage: result.usage,
  })
}
