import type { TraceEventType } from '../../types'
import type { GraphNode, Project } from '../../types/graph'
import type { AgentRole } from '../inference/modelRouting'
import { getDesktopBridge } from '../desktop/desktopBridge'
import { recallContext } from '../memory/recallContext'
import { resolveEpicId } from '../memory/memoryUtils'
import { taskGraphEngine } from '../taskGraphEngine'
import { emitSkillToolTrace } from './emitSkillTrace'
import { toolTraceType, validateToolCall, type ValidatedToolCall } from './skillToolSchema'
import type { SkillLoopToolStep } from './skillTypes'

const DEFAULT_TEST_COMMAND = 'npm test'

export interface SkillToolContext {
  project: Project
  node: GraphNode
  worktreePath: string
  agentRole: AgentRole
  sessionId: string
  allowedTools: Set<string>
}

export async function runSkillTool(
  rawTool: string,
  rawArgs: unknown,
  ctx: SkillToolContext,
): Promise<SkillLoopToolStep> {
  const validated = validateToolCall(rawTool, rawArgs)
  if (!ctx.allowedTools.has(validated.tool)) {
    throw new Error(`Tool "${validated.tool}" is not allowed for this skill run`)
  }

  const result = await executeTool(validated, ctx)
  const traceType = toolTraceType(validated.tool) as TraceEventType

  await emitSkillToolTrace({
    projectId: ctx.project.id,
    nodeId: ctx.node.id,
    sessionId: ctx.sessionId,
    traceType,
    label: `${validated.tool}: ${summarizeArgs(validated)}`,
    detail: result.slice(0, 4000),
    payload: { tool: validated.tool, args: validated.args },
  })

  return {
    tool: validated.tool,
    args: validated.args,
    result,
    traceType,
  }
}

function summarizeArgs(call: ValidatedToolCall): string {
  if (call.tool === 'read_file') return String(call.args.path)
  if (call.tool === 'search_code') return String(call.args.query)
  if (call.tool === 'run_tests') return String(call.args.command ?? DEFAULT_TEST_COMMAND)
  if (call.tool === 'fetch_context') return String(call.args.query ?? 'default')
  return call.tool
}

async function executeTool(call: ValidatedToolCall, ctx: SkillToolContext): Promise<string> {
  const bridge = await getDesktopBridge()

  switch (call.tool) {
    case 'read_file': {
      const path = String(call.args.path)
      const res = await bridge.readWorkspaceFile(ctx.worktreePath, path)
      if (!res.success) throw new Error(res.error ?? `Failed to read ${path}`)
      return res.content
    }
    case 'search_code': {
      const query = String(call.args.query)
      const limit = typeof call.args.limit === 'number' ? call.args.limit : 20
      const res = await bridge.searchWorkspace(ctx.worktreePath, query, limit)
      if (!res.success) throw new Error(res.error ?? 'Search failed')
      if (res.matches.length === 0) return 'No matches found.'
      return res.matches
        .map(m => `${m.path}:${m.line}: ${m.text}`)
        .join('\n')
    }
    case 'get_git_diff': {
      const diff = await bridge.getGitDiff(ctx.worktreePath)
      const header = `Changed files: ${diff.changedFiles.join(', ') || 'none'} (+${diff.insertions}/-${diff.deletions})`
      return `${header}\n\n${diff.rawDiff || '(no diff)'}`
    }
    case 'fetch_context': {
      const graphState = taskGraphEngine.getState()
      const epicId = resolveEpicId(ctx.node.id, graphState.nodes)
      const recall = await recallContext({
        projectId: ctx.project.id,
        nodeId: ctx.node.id,
        agentRole: ctx.agentRole,
        epicId,
        sessionId: ctx.sessionId,
        query: typeof call.args.query === 'string' ? call.args.query : undefined,
      })
      return recall.formattedBlock || 'No relevant memories found.'
    }
    case 'run_tests': {
      const meta = ctx.node.metadata as Record<string, unknown>
      const command = String(call.args.command ?? meta.testCommand ?? DEFAULT_TEST_COMMAND)
      const res = await bridge.runWorkspaceCommand(ctx.worktreePath, command)
      const output = [res.stdout, res.stderr].filter(Boolean).join('\n')
      return `exit=${res.exitCode}\n${output || '(no output)'}`
    }
    default:
      throw new Error(`Unhandled tool: ${call.tool}`)
  }
}
