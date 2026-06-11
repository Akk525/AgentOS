export type PhaseStatus = 'done' | 'current' | 'upcoming' | 'future'

export interface RoadmapPhase {
  version: string
  title: string
  status: PhaseStatus
  description: string
  items: string[]
}

export const ROADMAP_PHASES: RoadmapPhase[] = [
  {
    version: 'v0.x–v2.1',
    title: 'Foundation',
    status: 'done',
    description: 'Observatory UI shell, orchestration layer, desktop bridge, and first real git integrations.',
    items: [
      'RuntimeEngine + OrchestratorRuntime architecture',
      'Agent Observatory UI (7-tab orchestration view)',
      'Tauri desktop app with folder picker + repo validation',
      'Real git worktree creation (desktop)',
      'Allowlisted command execution + live git diff',
      'Permission escalation model + human override controls',
      'OSS readiness: docs, CI, onboarding, landing page',
    ],
  },
  {
    version: 'Phase A',
    title: 'Graph Foundation',
    status: 'done',
    description: 'Task graph as source of truth, local persistence, goal entry, and graph-backed Observatory views.',
    items: [
      '✓ SQLite local store via Tauri (graph, events, sessions) — Sprint 1',
      '✓ TaskGraphEngine + dependency executor + event timeline — Sprint 2',
      '✓ Goal entry flow (natural language → mock planner stub) — Sprint 3',
      '✓ Dashboard / StatusBar / Sessions wired to graph — Sprint 3b',
      '✓ Orchestrator sessions from graph; session shell persistence — Sprint 4 tail',
      '✓ New Project CTA replaces cosmetic New Task modal',
    ],
  },
  {
    version: 'Phase B',
    title: 'Year 1 — Real Agent Loop',
    status: 'current',
    description: 'Describe a project, supervise agents, review diffs, approve merges, obtain a working app.',
    items: [
      '✓ Multi-model inference + role → model routing — Sprint 5',
      '✓ Planner agent: goal → epics → tasks with acceptance criteria — Sprint 5',
      '✓ Builder agent: graph node → worktree → implement → patch — Sprint 6',
      '✓ Reviewer agent + human approval gate — Sprint 6',
      '✓ Tester agent with failure → new task creation — Sprint 7',
      'Governance modes (Manual / Assisted / Autonomous / Full Auto)',
      'Approval gates wired to merge flow',
      'Real cost accounting from provider token usage',
    ],
  },
  {
    version: 'Phase C',
    title: 'Year 2 — Provenance & Scale',
    status: 'future',
    description: 'Replay, memory, skills, and multi-month project maintenance with minimal supervision.',
    items: [
      'Replay engine — step-through provenance for any feature',
      'Persistent agent memory + Memora integration API',
      'Skills framework executor (SKILL.md-compatible)',
      'Observatory consolidation — unified graph-centric dashboard',
      'Concurrent session scale + worktree lifecycle cleanup',
      'MCP tool integration via skills',
    ],
  },
  {
    version: 'Deferred',
    title: 'Out of Scope (24+ months)',
    status: 'future',
    description: 'Explicitly deferred to stay focused on solo developers and local-first execution.',
    items: [
      'Remote runner / cloud execution (formerly v3.0)',
      'Enterprise multi-tenant / SSO / org admin',
      'Full plugin sandbox runtime (skills framework covers extensibility)',
      'Cloud provider integrations as a platform requirement',
    ],
  },
]
