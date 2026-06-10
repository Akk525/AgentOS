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
    status: 'current',
    description: 'Task graph as source of truth, local persistence, and goal entry — unblocks Year 1.',
    items: [
      '✓ SQLite local store via Tauri (graph, events, sessions) — Sprint 1',
      '✓ Tauri-first dev workflow + boot store init + storage diagnostics',
      '✓ LogsView fix + graph entity types (src/types/graph.ts)',
      '✓ TaskGraphEngine — canonical store + dependency executor — Sprint 2',
      '✓ Append-only event log feeding timeline UI — Sprint 2',
      '✓ Kanban + Plan wired as graph projections (read-only) — Sprint 2',
      'Goal entry flow (natural language → plan stub)',
      'Replace remaining mockTasks usage (Dashboard, Sessions)',
    ],
  },
  {
    version: 'Phase B',
    title: 'Year 1 — Real Agent Loop',
    status: 'upcoming',
    description: 'Describe a project, supervise agents, review diffs, approve merges, obtain a working app.',
    items: [
      'Multi-model inference + role → model routing',
      'Planner agent: goal → epics → tasks with acceptance criteria',
      'Builder agent: graph node → worktree → implement → patch',
      'Reviewer + Tester agents with failure → new task creation',
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
