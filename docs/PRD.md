# AgentOS — Product Requirements Document (Future State)

**The Open Operating System for Autonomous Software Development**

This document describes the future-state vision for AgentOS. It defines a new product category — not a coding agent, but an operating system for coordinating autonomous software work. The current alpha prototype implements a subset of this vision; see [GAP_ANALYSIS.md](GAP_ANALYSIS.md) for an honest status map and [ROADMAP.md](ROADMAP.md) for the build sequence.

---

## One-Sentence Vision

If Cursor is **AI inside the editor**, and Claude Code is **AI inside the terminal**, then AgentOS becomes **AI inside the software development lifecycle**.

---

## Category Positioning

| Product | Metaphor | User relationship |
|---------|----------|-------------------|
| **Cursor** | AI inside the editor | Pair programmer at the keyboard |
| **Claude Code** | AI inside the terminal | Agent you talk to in a shell |
| **AgentOS** | AI inside the SDLC | Supervisor of an autonomous software organization |

AgentOS is not a chatbot wrapper. It is not an autonomous swarm that replaces the developer. It is a **persistent execution environment** where autonomous software workflows can be observed, controlled, replayed, and governed.

**The user remains the ultimate authority. Agents execute. Humans decide.**

---

## Core Philosophy

### Traditional Development

```
Human → Code
```

### AI Coding Assistants

```
Human → Agent → Code
```

### AgentOS

```
Human → Goals → Task Graph → Agent Organization → Software System
```

**The task graph is the source of truth. The codebase is a projection of that graph.**

Everything in AgentOS attaches to the graph: dependencies, ownership, execution history, decisions, outcomes, costs, and approvals.

### Design Principles

1. **Agents are workers, not products.** The user never directly interacts with most agents. They supervise outcomes.
2. **Not Kanban. Not chat. The graph.** Work surfaces are projections of graph state — not parallel systems.
3. **Controlled autonomy.** Autonomy is adjustable; governance is never optional.
4. **Local-first.** Works on a laptop, in an enterprise network, on an airplane. No cloud dependency required.
5. **Software provenance.** Every artifact can answer: *Why does this feature exist?*

---

## User Story

A developer enters:

> Build a multi-tenant SaaS CRM with Stripe billing and role-based permissions.

AgentOS:

1. Creates a project plan
2. Creates epics (Authentication, Billing, Dashboard, CRM, Admin)
3. Generates a task graph with dependencies
4. Assigns specialized agents (Planner, Builder, Reviewer, Tester)
5. Creates isolated workspaces (git worktrees) per task
6. Implements features
7. Reviews changes
8. Runs tests
9. Creates new tasks from failures
10. Requests approval when required

The developer **supervises** rather than manually coordinates.

---

## The 15 Pillars

Each pillar includes purpose, user value, Year 1 scope, Year 2 scope, current codebase status, and dependencies.

---

### Pillar 1: Project Planning

**Purpose.** Convert high-level goals into structured, executable work. A Planner agent decomposes outcomes into epics, tasks, acceptance criteria, dependencies, and risk assessments.

**User value.** The developer describes *what* they want built; AgentOS produces *how* it will be built — continuously updated as scope evolves.

**Year 1 scope.**
- Goal entry UI (natural language project description)
- Planner agent produces epics and tasks with acceptance criteria
- Each task contains: requirements, dependencies, definition of done, risk assessment, estimated cost
- Planner updates scope when blockers or failures occur

**Year 2 scope.**
- Continuous replanning as codebase evolves
- Cross-project plan templates
- Scope diffing (what changed and why)

**Current codebase status.** Partial. Types exist (`RuntimePlan`, `PlanSubtask` in `src/types/index.ts`). UI exists (`RuntimePlanView.tsx`). Data is mock (`mockPlanning.ts`). No goal entry flow, no epics, no acceptance criteria, no real planner agent.

**Dependencies.** Pillar 2 (Task Graph), Pillar 9 (Multi-Model Runtime).

**Non-goals.** Enterprise portfolio management, Jira sync, multi-team capacity planning.

---

### Pillar 2: Task Graph Engine

**Purpose.** The most important component. Not Kanban. Not chat. A persistent directed acyclic graph that is the canonical source of truth for all work.

**User value.** See the full dependency structure of a project. Understand what blocks what. Know why work exists.

**Year 1 scope.**
- Persistent graph store (nodes: epics, tasks; edges: dependencies)
- Graph executor: schedules ready nodes, respects dependencies
- All UI views (Kanban, timeline, sessions) are projections of graph state
- Graph stores: dependencies, ownership, execution history, decisions, outcomes

**Year 2 scope.**
- Dynamic graph layout
- Merge/conflict detection across parallel branches
- Graph queries (e.g., "show all tasks that touch auth")

**Current codebase status.** Partial. `PlanSubtask.dependsOn[]` and `RuntimeGraph.tsx` exist but graph is visual-only with hardcoded positions. Kanban (`TaskBoard.tsx`) is disconnected from plans. **SQLite store schema + CRUD shipped (Sprint 1)** — `graph_nodes`/`graph_edges` tables and `src/types/graph.ts` types exist; no `TaskGraphEngine` or executor yet.

**Dependencies.** Pillar 14 (Local First — persistence layer).

**Non-goals.** Replacing issue trackers for human teams. Graph is for agent-orchestrated work.

---

### Pillar 3: Agent Organization

**Purpose.** Manage a team of specialized agents as workers — not as products the user chats with.

**User value.** The right specialist handles each task automatically. The developer supervises the organization, not individual conversations.

**Agent roles:**

| Role | Responsibility |
|------|----------------|
| Planner | Creates and updates work |
| Builder | Implements work |
| Reviewer | Reviews work |
| Tester | Validates work |
| Refactor Agent | Improves architecture |
| Research Agent | Investigates requirements |
| Documentation Agent | Maintains docs |

**Year 1 scope.**
- Agent registry with role → capability mapping
- Automatic assignment from graph node type
- Agent lifecycle: spawn, execute, complete, archive
- User interacts with outcomes and approvals, not agent chat

**Year 2 scope.**
- Multiple persistent agents across long-running projects
- Agent specialization via skills (Pillar 10)
- Cross-agent handoff protocols

**Current codebase status.** Partial. `Agent` type and `AgentsView.tsx` exist as a catalog. `SpawnSessionModal.tsx` assigns agents to sessions. No registry service, no real process management, agents presented as selectable personas (needs reframing).

**Dependencies.** Pillar 2, Pillar 4, Pillar 9.

---

### Pillar 4: Worktree Runtime

**Purpose.** Every task receives an isolated execution environment. No shared mutation. No collisions.

**User value.** Parallel work on independent features without branch chaos.

**Year 1 scope.**
- One git worktree per active task
- Worktree contains: repo snapshot, task context, memory reference, execution history
- Create on task start, archive on completion
- Real diff viewing per worktree

**Year 2 scope.**
- Worktree cleanup and merge lifecycle
- Conflict detection before merge
- Worktree status in Observatory

**Current codebase status.** Partial (desktop). Rust `create_worktree` in `src-tauri/src/commands.rs` is real. `get_git_diff` works. Browser mode simulates via `WebBridge`. Missing: delete/cleanup, merge flow, full per-session isolation.

**Dependencies.** Pillar 2 (task → worktree binding).

---

### Pillar 5: Execution Timeline

**Purpose.** Every action is recorded in an append-only event log. Nothing disappears. Everything is inspectable.

**User value.** Answer "what happened?" at any granularity — per task, per session, or globally.

**Example timeline:**
```
10:01 Planner created task
10:04 Builder spawned
10:06 npm install
10:08 Added NextAuth
10:12 Reviewer flagged issue
10:15 Fix applied
10:18 Tests passed
10:20 Merge approved
```

**Year 1 scope.**
- Durable event log (local store)
- Per-session timeline (`Timeline.tsx`) fed from real events
- Global orchestration timeline (`OrchestratorTimeline.tsx`)
- Event types cover: planning, execution, review, test, approval, human override

**Year 2 scope.**
- Cross-session correlation
- Export and audit trail
- Timeline search and filtering

**Current codebase status.** Partial. UI exists for both timelines. Events are mock/simulated with a 60-item cap in `orchestratorRuntime.ts`. **Append-only `events` table + `store_append_event` shipped (Sprint 1)** — boot writes init `system_event`; timeline UI not yet wired to store.

**Dependencies.** Pillar 14 (persistence).

---

### Pillar 6: Replay Engine

**Purpose.** Every artifact can be replayed. Software provenance — trace any feature back to the user request, planning decision, implementation, review, and merge.

**User value.** Answer "Why does this feature exist?" with a step-through replay of the full decision chain.

**Year 1 scope.** Not required for Year 1 success. UI stubs only.

**Year 2 scope.**
- Session event recording (requires Pillar 5 durable log)
- Step-through replay with diff per step
- Branch-point exploration ("what if reviewer had rejected?")

**Current codebase status.** Missing. Replay buttons in `AgentSession.tsx`, `SessionControls.tsx`, `SessionArchivePanel.tsx` are no-ops.

**Dependencies.** Pillar 5 (Execution Timeline), Pillar 11 (Memory).

---

### Pillar 7: Human Governance

**Purpose.** AgentOS never removes control. Autonomy is adjustable per project and per action class.

**Governance modes:**

| Mode | Behavior |
|------|----------|
| **Manual** | Everything requires approval |
| **Assisted** | Implementation autonomous; merge approval required |
| **Autonomous** | Build/review/test autonomous; deploy approval required |
| **Full Auto** | Everything autonomous (disposable side projects only) |

**Year 1 scope.**
- Governance mode selector (project-level)
- Takeover, pause, inject instruction wired to real session state
- Human override logged to reasoning feed
- Override history persisted

**Year 2 scope.**
- Per-action-class autonomy overrides
- Governance audit log with replay integration

**Current codebase status.** Partial. `TakeoverPanel.tsx`, `InjectModal.tsx`, session modes in types. `overrideAssignment` logs but does not mutate session fields. Settings toggles are display-only.

**Dependencies.** Pillar 8 (Approval Gates), Pillar 5 (audit log).

---

### Pillar 8: Approval Gates

**Purpose.** Configurable authorization checkpoints before high-impact actions.

**Gate examples:** merge PR, delete file, install dependency, deploy production, create infrastructure.

**Year 1 scope.**
- Gate registry with configurable policies per governance mode
- `PermissionEscalationModal` wired to re-run or block commands
- Review approval gates connected to merge flow
- Rust allowlist as baseline safety (already exists)

**Year 2 scope.**
- Custom gate definitions
- Time-limited auto-approve for trusted patterns
- Gate analytics in Observatory

**Current codebase status.** Partial. Escalation modal, risk classification in `runtimeEngine.ts`, Rust allowlist in `commands.rs`. Gates not connected to merge or file-write flows.

**Dependencies.** Pillar 7, Pillar 4 (merge).

---

### Pillar 9: Multi-Model Runtime

**Purpose.** Model-agnostic orchestration. Users choose models; AgentOS routes work to the right provider.

**Supported providers (target):** Claude, GPT, Codex, Gemini, DeepSeek, Qwen, Ollama, vLLM.

**Routing examples:**
- Planner → Claude
- Builder → DeepSeek
- Reviewer → GPT
- Tester → Gemini

**Year 1 scope.**
- Provider registry with health checks (partial today)
- Streaming inference for agent loops
- Role → model routing configuration
- Failover when provider unavailable

**Year 2 scope.**
- Load balancing across providers
- Cost-aware routing
- Local model priority (Ollama/vLLM first)

**Current codebase status.** Partial. `ProviderRegistry`, Ollama ping real; others probe reachability. No inference, no streaming, no routing.

**Dependencies.** None (foundational for agent execution).

---

### Pillar 10: Skills Framework

**Purpose.** Agents acquire domain capabilities via community-contributed skills.

**Skill examples:** Next.js, React, Rust, Solidity, FastAPI, AWS, Terraform.

**Skills contain:** prompts, workflows, tools, policies, documentation.

**Year 1 scope.** Catalog UI only (current state). Executor deferred.

**Year 2 scope.**
- Skill loader and executor
- Skill → agent binding at assignment time
- Community skill registry format (SKILL.md-compatible)
- MCP tool integration via skills

**Current codebase status.** Partial. `Skill` type, `SkillsView.tsx`, `mockSkills.ts`. No executor. Skill picker in `NewTaskModal.tsx` is cosmetic.

**Dependencies.** Pillar 3, Pillar 9.

---

### Pillar 11: Persistent Agent Memory

**Purpose.** Agents remember design patterns, previous bugs, architectural decisions, and coding style across sessions.

**Year 1 scope.** Not required. Session-scoped context only.

**Year 2 scope.**
- Per-agent memory store (local)
- Memory injection at task start
- Cross-task recall ("we fixed this pattern before in auth module")
- **Memora integration point** — Memora plugs in here as the provenance and memory layer for autonomous systems. Not a Year 1 dependency.

**Current codebase status.** Missing. `fetch_context` trace event type exists; no vector store or memory API.

**Dependencies.** Pillar 14 (persistence), Pillar 5 (timeline for memory provenance).

---

### Pillar 12: Testing & Verification

**Purpose.** Automated validation with structured outputs that feed back into the task graph.

**Tester agent performs:** unit tests, integration tests, security analysis, performance analysis, dependency analysis.

**Outputs:** pass rate, coverage, risk score, regression report. Failures automatically generate new graph nodes.

**Year 1 scope.**
- Real test execution via allowlisted commands (partial in desktop)
- Test results attached to task nodes
- Failure → new task creation in graph

**Year 2 scope.**
- Coverage gates blocking merge
- Security scan integration
- Flaky test detection

**Current codebase status.** Partial. Test UI, `cmdRerunTests` fakes pass. Real `npm test` via Rust allowlist on desktop. No AgentOS project test suite.

**Dependencies.** Pillar 2, Pillar 4.

---

### Pillar 13: Cost Accounting

**Purpose.** Every action tracks cost. Developers understand spending per feature, epic, and project.

**Example:**
```
Feature: Authentication
  Planning       $0.04
  Implementation $0.80
  Review         $0.12
  Testing        $0.30
  Total          $1.26
```

**Year 1 scope.**
- Token usage from provider responses
- Cost rollup per task and epic
- Dashboard cost display (UI exists, needs real data)

**Year 2 scope.**
- Budget alerts
- Cost-aware routing (Pillar 9)
- Historical cost trends

**Current codebase status.** Partial. Display fields and mock tickers in `orchestratorRuntime.ts`. No provider-reported metering.

**Dependencies.** Pillar 9, Pillar 5.

---

### Pillar 14: Local First

**Purpose.** First-class support for local models, local repositories, local memory, and offline execution.

**Year 1 scope.**
- Tauri desktop app (exists)
- Local SQLite store for graph, events, memory
- Ollama as default local provider
- No cloud account required

**Year 2 scope.**
- Offline daemon sidecar
- Local model fine-tuning hooks
- Air-gapped enterprise mode

**Current codebase status.** Partial (Sprint 1 complete). Tauri is the default dev entry (`npm run dev`). SQLite store exists via `getLocalStore()` — schema covers projects, graph nodes/edges, events, sessions. Boot initializes DB before UI renders. Orchestrator/Kanban not yet hydrated from store. Browser preview (`npm run dev:web`) has no persistence.

**Dependencies.** Foundational for Pillars 2, 5, 11, 13.

---

### Pillar 15: Agent Observatory

**Purpose.** The flagship UI. Not chat. Not prompts. An observatory for supervising autonomous software development.

**Displays:** task graph, Kanban (projection), execution timeline, worktrees, agent status, cost, memory, replay.

**Think:** Linear + GitHub + Temporal + Claude Code + DevTools — fused together.

**Year 1 scope.**
- Consolidate existing views under graph-centric navigation
- Goal entry as primary entry point (not "new task" modal)
- Real data binding (replace mock data incrementally)
- Fix broken Logs nav (`LogsView` missing — use `RuntimeLogPanel`)

**Year 2 scope.**
- Unified Observatory dashboard replacing siloed views
- Replay panel integrated
- Memory inspector
- Cost analytics

**Current codebase status.** Mostly exists as UI shell. Comprehensive views built; most show mock data. `LogsView` fixed; storage diagnostics in Runtime view. Goal entry and graph-centric navigation still missing.

**Dependencies.** All other pillars (Observatory is the projection layer).

---

## Governance Model Summary

| Mode | Autonomous | Requires approval |
|------|------------|-------------------|
| Manual | Nothing | All actions |
| Assisted | Plan, implement, test, review | Merge |
| Autonomous | Plan, implement, test, review, merge | Deploy |
| Full Auto | Everything | Nothing (use at own risk) |

Default for new projects: **Assisted**.

---

## Year 1 Success Criteria

A developer can:

1. Describe a project goal in natural language
2. Generate a plan with epics and task graph
3. Spawn specialized agents assigned to graph nodes
4. Watch work happen in the Observatory (timeline, diffs, agent status)
5. Review diffs per task/worktree
6. Approve merges through governance gates
7. Obtain a working application

---

## Year 2 Success Criteria

A developer can:

1. Run multiple persistent agents across a large repository
2. Maintain projects over months with continuous graph updates
3. Replay months of execution history for any feature
4. Delegate entire features with minimal supervision
5. Resume projects from agent memory
6. Supervise rather than implement

---

## Open Source & Audience Constraints

- **Audience:** Solo developers and small teams. Not enterprise.
- **License:** Apache 2.0
- **No enterprise distractions:** No multi-tenant SaaS, no SSO, no org admin, no billing platform (except as a *target app* users might build with AgentOS)
- **No cloud dependency:** Cloud runners (formerly v3.0 roadmap) are explicitly deferred beyond the 12–24 month horizon
- **Community skills:** Skills framework is community-contributed; core OS stays lean

---

## Memora Integration Point

Pillar 11 (Persistent Agent Memory) and Pillar 6 (Replay Engine) are natural integration points for **Memora** — a provenance and replay system for autonomous software. Memora is not a Year 1 dependency. The AgentOS event log and graph store should expose a stable API surface for Memora to consume when ready.

---

## Related Documents

- [GAP_ANALYSIS.md](GAP_ANALYSIS.md) — current vs future implementation matrix
- [ROADMAP.md](ROADMAP.md) — phased build plan
- [ARCHITECTURE.md](../ARCHITECTURE.md) — current and target technical architecture
- [README.md](../README.md) — project overview and setup
