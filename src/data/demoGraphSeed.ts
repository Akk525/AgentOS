import { mockRuntimePlans, mockSubtasks } from './mockPlanning'
import { getLocalStore } from '../runtime/store'
import type { GraphNode } from '../types/graph'

export async function seedDemoGraphIfEmpty(): Promise<string | null> {
  const store = getLocalStore()
  const projects = await store.listProjects()

  if (projects.length > 0) {
    const first = projects[0]
    const graph = await store.getProject(first.id)
    if (graph && graph.nodes.length > 0) return first.id
  }

  const plan = mockRuntimePlans[0]
  const project = await store.createProject({
    title: plan.title,
    goalText: plan.description,
    governanceMode: 'assisted',
  })

  await store.upsertNode({
    id: 'epic-001',
    projectId: project.id,
    type: 'epic',
    title: plan.title,
    description: plan.description,
    status: 'running',
    metadata: {
      plannerSessionId: plan.plannerSessionId,
      plannerName: plan.plannerName,
      workspaceName: plan.workspaceName,
      reasoning: plan.reasoning,
    },
  })

  await store.appendEvent({
    projectId: project.id,
    type: 'plan_created',
    message: `${plan.plannerName} created plan: ${plan.title}`,
    severity: 'info',
    payload: {
      agentName: plan.plannerName,
      workspaceName: plan.workspaceName,
    },
  })

  for (const st of mockSubtasks) {
    const status = mapSubtaskStatus(st.status)
    await store.upsertNode({
      id: st.id,
      projectId: project.id,
      type: 'task',
      parentId: 'epic-001',
      title: st.title,
      status,
      assignedRole: st.role,
      assignedSessionId: st.assignedSessionId ?? null,
      branch: st.branch ?? null,
      metadata: {
        role: st.role,
        assignedAgentName: st.assignedAgentName,
        patchVersion: st.patchVersion,
        testsPassed: st.testsPassed,
        assignedAgentId: `agent-${st.role}`,
        repo: 'boilerbyte',
      },
    })

    for (const dep of st.dependsOn) {
      await store.upsertEdge({
        projectId: project.id,
        fromNodeId: st.id,
        toNodeId: dep,
        edgeType: 'depends_on',
      })
    }

    if (st.assignedAgentName) {
      await store.appendEvent({
        projectId: project.id,
        nodeId: st.id,
        sessionId: st.assignedSessionId,
        type: 'subtask_assigned',
        message: `${st.assignedAgentName} assigned to ${st.title}`,
        severity: 'info',
        payload: {
          agentName: st.assignedAgentName,
          workspaceName: plan.workspaceName,
        },
      })
    }
  }

  return project.id
}

function mapSubtaskStatus(status: string): GraphNode['status'] {
  switch (status) {
    case 'pending':
    case 'assigned':
    case 'running':
    case 'review':
    case 'blocked':
    case 'done':
      return status
    default:
      return 'pending'
  }
}
