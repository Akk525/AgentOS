import type { GraphNode, Project } from '../../types/graph'
import { completeForRole, streamForRole } from '../inference/inferenceRuntime'
import { providerRegistry } from '../providers/providerRegistry'
import { InferenceError } from '../inference/types'
import { sumTokenUsage } from '../cost/modelPricing'
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
  recalledMemory?: string,
  skillContext?: string,
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
${recalledMemory ? `\n${recalledMemory}\n` : ''}
${skillContext ? `\n${skillContext}\n` : ''}
Implement this task. Return JSON with file changes.`
}

export interface RunBuilderOptions {
  repoPath: string
  providerId?: string
  modelId?: string
  recalledMemory?: string
  skillContext?: string
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

  const desktopBridge = await getDesktopBridge()
  const wtResult = await desktopBridge.createWorktree(options.repoPath, branchName, worktreeName)
  if (!wtResult.success || !wtResult.worktreePath) {
    throw new Error(wtResult.error ?? 'Worktree creation failed')
  }

  const worktreePath = wtResult.worktreePath
  const meta = node.metadata as Record<string, unknown>
  const providerId = options.providerId ?? (meta.provider as string | undefined)
  const modelId = options.modelId ?? (meta.model as string | undefined)

  let skillContext = options.skillContext
  if (!skillContext) {
    const { applySkillsForNode } = await import('../skills/applySkillsForNode')
    const skillResult = await applySkillsForNode({
      node,
      project,
      worktreePath,
      agentRole: 'builder',
      providerId,
      modelId,
      sessionId,
    })
    skillContext = skillResult?.contextBlock
  }

  const userPrompt = buildUserPrompt(node, project, worktreePath, options.recalledMemory, skillContext)
  const inferenceRequest = {
    messages: [
      { role: 'system' as const, content: BUILDER_SYSTEM_PROMPT },
      { role: 'user' as const, content: userPrompt },
    ],
    jsonMode: true,
    temperature: 0.2,
  }

  let streamBuffer = ''
  let lastStreamFlush = 0
  const flushStreamToSession = async (label: string, force = false) => {
    const now = Date.now()
    if (!force && now - lastStreamFlush < 400) return
    lastStreamFlush = now
    await updateSessionData(project.id, node.id, {
      terminalOutput: [`${label} (${streamBuffer.length} chars)`, streamBuffer.slice(-800)],
    })
  }

  const resolvedProvider = providerId ?? 'anthropic'
  const providerBridge = providerRegistry.get(resolvedProvider)
  const runInference = providerBridge?.stream
    ? () =>
        streamForRole(
          'builder',
          inferenceRequest,
          chunk => {
            if (chunk.delta) streamBuffer += chunk.delta
            void flushStreamToSession('Builder generating')
          },
          { providerId, modelId },
        )
    : () => completeForRole('builder', inferenceRequest, { providerId, modelId })

  let result = await runInference()
  await flushStreamToSession('Builder response complete', true)

  const usageParts = [result.usage]
  let output
  try {
    output = parseBuilderOutput(result.content)
  } catch (firstErr) {
    if (!(firstErr instanceof InferenceError) || firstErr.code !== 'invalid_plan') {
      throw firstErr
    }
    streamBuffer = ''
    const repairResult = await completeForRole(
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
    result = repairResult
    usageParts.push(repairResult.usage)
    output = parseBuilderOutput(result.content)
  }
  const combinedUsage = sumTokenUsage(usageParts)

  const writeResult = await desktopBridge.writeWorkspaceFiles(worktreePath, output.files)
  if (!writeResult.success) {
    throw new Error(writeResult.error ?? 'Failed to write files')
  }

  const terminalOutput: string[] = [
    `Worktree: ${worktreePath}`,
    `Wrote ${writeResult.filesWritten} file(s)`,
    ...output.files.map(f => `  → ${f.path}`),
  ]

  for (const cmd of output.commands ?? []) {
    const cmdResult = await desktopBridge.runWorkspaceCommand(worktreePath, cmd)
    terminalOutput.push(
      `$ ${cmd}`,
      cmdResult.stdout || cmdResult.stderr || `(exit ${cmdResult.exitCode})`,
    )
    if (cmdResult.blocked && cmdResult.blockReason) {
      terminalOutput.push(`Blocked: ${cmdResult.blockReason}`)
    }
  }

  const diffResult = await desktopBridge.getGitDiff(worktreePath)
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
    usage: combinedUsage.totalTokens > 0 ? combinedUsage : result.usage,
  })
}
