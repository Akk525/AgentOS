# AgentOS Architecture

This document explains the runtime layers, state model, and event system in detail. Read this before contributing to the runtime or orchestration layers.

---

## Layers

```
┌──────────────────────────────────────────────────────────────────┐
│  UI — React components                                           │
│  src/components/                                                 │
│                                                                  │
│  Reads state via:  useOrchestrator()  useRuntime()              │
│  Calls actions via: context callbacks                            │
└──────────────────────────┬───────────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│  Context Providers                                               │
│  src/context/OrchestratorContext.tsx                             │
│  src/context/RuntimeContext.tsx                                  │
│                                                                  │
│  • useState to hold current snapshot                             │
│  • subscribe() to runtime singleton on mount                     │
│  • expose action callbacks to UI                                 │
└──────────┬───────────────────────────────────┬───────────────────┘
           │ subscribe / patch                 │ subscribe / dispatch
┌──────────▼──────────────┐        ┌───────────▼──────────────────┐
│  OrchestratorRuntime    │        │  RuntimeEngine               │
│  src/runtime/           │        │  src/runtime/                │
│  orchestratorRuntime.ts │        │  runtimeEngine.ts            │
│                         │        │                              │
│  Manages:               │        │  Manages:                    │
│  • activeSessions       │        │  • session spawn             │
│  • runtimePlans         │        │  • worktree lifecycle        │
│  • reasoning log        │        │  • patch lifecycle           │
│  • blockers             │        │  • provider commands         │
│  • review sessions      │        │  • runtime notifications     │
│  • timeline feed        │        │  • diagnostics               │
│                         │        │                              │
│  Observer set:          │        │  Emits events →              │
│  Set<Listener>          │        │  RuntimeBridge →             │
│  patch() → notify all   │        │  RuntimeContext dispatch     │
└─────────────────────────┘        └──────────────────────────────┘
                                              │
                               ┌──────────────▼───────────────────┐
                               │  RuntimeDaemon                   │
                               │  RuntimeBridge                   │
                               │  RuntimeClient                   │
                               │  ProviderBridge                  │
                               │  ProviderRegistry                │
                               └──────────┬───────────────────────┘
                                          │
                               ┌──────────▼───────────────────────┐
                               │  Desktop Bridge (v2.0)           │
                               │  src/runtime/desktop/            │
                               │                                  │
                               │  getDesktopBridge()              │
                               │    → TauriBridge  (desktop)      │
                               │    → WebBridge    (browser)      │
                               │                                  │
                               │  Capabilities exposed:           │
                               │  • pickDirectory()               │
                               │  • validateRepo()  ← read-only   │
                               │  • getPlatform()                 │
                               └──────────┬───────────────────────┘
                                          │ invoke() (Tauri only)
                               ┌──────────▼───────────────────────┐
                               │  Rust Backend (src-tauri/)       │
                               │                                  │
                               │  validate_repo — reads .git/HEAD │
                               │  get_platform  — OS/arch query   │
                               │  (folder picker via plugin-dialog│
                               └──────────────────────────────────┘
```

---

## State Model

There are **two independent state trees**, each owned by a singleton:

### 1. RuntimeEngine state

Managed by `runtimeReducer.ts`. Includes:
- connection and daemon status
- provider health
- live worktrees
- patch lifecycle
- workspace history
- runtime notifications

The reducer receives dispatched `RuntimeAction` objects and returns a new state snapshot. The engine emits `RuntimeEvent` objects which are received by `RuntimeContext`, which dispatches the appropriate actions.

### 2. OrchestratorRuntime state

A plain object managed directly inside `OrchestratorRuntime`. Includes:
- `activeSessions: ActiveSession[]`
- `dependencies: SessionDependency[]`
- `runtimeQueue: RuntimeQueueEntry[]`
- `runtimeLoad: RuntimeLoad`
- `reviewSessions: ReviewSession[]`
- `timeline: OrchestratorEvent[]`
- `runtimePlans: RuntimePlan[]`
- `reasoning: RuntimeReasoning[]`
- `blockers: RuntimeBlocker[]`

The runtime calls `this.patch(updates)` to merge updates and notify all subscribers.

---

## Event Flow — Runtime Engine

```
User action (e.g. spawnSession)
  → RuntimeClient.spawnSession(config)
  → RuntimeBridge.send({ type: 'SPAWN_SESSION', ... })
  → RuntimeEngine receives command
  → Engine runs cmdSpawnSession() over multiple setTimeout steps
  → Engine emits RuntimeEvent { type: 'SESSION_SPAWNED', ... }
  → RuntimeBridge receives event
  → RuntimeContext useEffect handler dispatches action
  → runtimeReducer returns new state
  → React re-renders
```

---

## Event Flow — Orchestrator

The orchestrator runtime is self-contained. It drives its own simulation:

```
OrchestratorRuntime.boot()
  → setInterval tickLoad()         // CPU / token / memory fluctuation
  → setInterval tickTokens()       // session token accumulation
  → setTimeout initiateReview()    // review handoff after 10s
  → setTimeout completeReview()    // approval after 35s
  → setTimeout unblockSession()    // cascade after approval

User action (e.g. escalateBlocker)
  → useOrchestrator().escalateBlocker(id)
  → orchestratorRuntime.escalateBlocker(id)
  → this.patch({ blockers: [...] })
  → this.pushReasoning({ ... })
  → all subscribers notified
  → React re-renders
```

---

## Adding State to OrchestratorRuntime

1. Add the field to `OrchestratorState` interface in `orchestratorRuntime.ts`
2. Add the field to `OrchestratorContextValue` in `OrchestratorContext.tsx` if you need to expose it
3. Initialize it in `private state = { ... }`
4. Update it via `this.patch({ yourField: newValue })`
5. Add any public methods that the UI should be able to call

---

## Adding State to RuntimeEngine

1. Add the field to `RuntimeState` in `runtimeReducer.ts`
2. Add an initial value in `initialState`
3. Add a new action type to `RuntimeAction` union
4. Handle it in the reducer `switch`
5. Add a new event type to `RuntimeEventType` in `runtimeTypes.ts`
6. Emit the event from `runtimeEngine.ts`
7. Dispatch the action from `RuntimeContext.tsx`

---

## Key File Map

| File | Purpose |
|---|---|
| `src/types/index.ts` | All shared TypeScript types |
| `src/runtime/runtimeTypes.ts` | Runtime event + command types |
| `src/runtime/runtimeReducer.ts` | Runtime state shape + reducer |
| `src/runtime/runtimeEngine.ts` | Command handlers + event emitters |
| `src/runtime/runtimeDaemon.ts` | Daemon simulation |
| `src/runtime/runtimeBridge.ts` | Engine ↔ context bridge |
| `src/runtime/runtimeClient.ts` | Public API for UI to call |
| `src/runtime/orchestratorRuntime.ts` | Orchestration singleton |
| `src/context/RuntimeContext.tsx` | Runtime state provider + actions |
| `src/context/OrchestratorContext.tsx` | Orchestration state provider + actions |
| `src/data/mockOrchestration.ts` | Demo sessions, reviews, timeline |
| `src/data/mockPlanning.ts` | Demo planner, plan, reasoning, blockers |
| `src/runtime/desktop/desktopTypes.ts` | Bridge interface + response types |
| `src/runtime/desktop/desktopBridge.ts` | Environment detection + bridge factory |
| `src/runtime/desktop/tauriBridge.ts` | Tauri IPC implementations (desktop only) |
| `src/runtime/desktop/webBridge.ts` | Browser fallback (simulated responses) |
| `src/types/graph.ts` | Graph store entity types (Project, GraphNode, GraphEdge, StoredEvent) |
| `src/runtime/store/index.ts` | `getLocalStore()` factory — Tauri SQLite or in-memory fallback |
| `src/runtime/store/tauriLocalStore.ts` | Tauri IPC wrappers for store commands |
| `src/hooks/usePersistence.ts` | Boot-time `store_init`; first-run system event |
| `src-tauri/src/main.rs` | Tauri application entry point |
| `src-tauri/src/commands.rs` | Rust command handlers (git, worktrees, allowlisted cmds) |
| `src-tauri/src/db/` | SQLite schema migrations + CRUD (`rusqlite`) |
| `src-tauri/src/store_commands.rs` | Tauri IPC handlers for LocalStore |
| `src-tauri/tauri.conf.json` | Window config, bundle settings, plugins |

---

## Design Constraints

**No arbitrary agent execution.** The runtime simulates agent behaviour but does not call real LLM APIs or execute real shell commands in this version. All session events are scripted simulations. PTY execution is a future milestone.

**Desktop bridge is the filesystem/git seam.** All real system access for repos, worktrees, and commands routes through `getDesktopBridge()` in `src/runtime/desktop/`. UI and runtime layers must never import `@tauri-apps/api` directly for these capabilities.

**Local store is the persistence seam.** All durable graph/event/session storage routes through `getLocalStore()` in `src/runtime/store/`. The factory resolves to `tauriLocalStore` (SQLite via Tauri IPC) in desktop mode and `memoryLocalStore` (no-op fallback) in browser preview. Adding a new store capability means adding a Tauri command in `store_commands.rs`, a method on `LocalStore`, and implementations in both stores.

**Observer pattern, not Redux.** State updates go through `patch()` on the singleton, which notifies all subscribers synchronously. React contexts hold a shallow copy and call `setState` on each notification.

**Separation of runtime and orchestration.** The `RuntimeEngine` handles session lifecycle mechanics (spawn, worktree, patch, diagnostics). The `OrchestratorRuntime` handles coordination and supervision (multi-session dependencies, plans, reasoning, reviews). They are independent and do not share state.

**Human override is always terminal.** Any public method exposed on `orchestratorRuntime` is a human action. Human actions are logged to the reasoning feed with `decisionType: 'human_override'`. They cannot be undone by the orchestrator.

---

## What Is Simulated vs Real

This table clarifies the current architecture boundary. The interfaces are designed so that real implementations slot in without changing the UI or orchestration layers.

| System | Current state | Real version (roadmap) |
|---|---|---|
| Session execution | Agent loop simulated — no real LLM calls | PTY bridge via Tauri IPC (v2.2) |
| Git worktrees | `git worktree add` via Rust (v2.1 ✓) | Already real in desktop mode |
| Command execution | Allowlisted via Rust `run_workspace_command` (v2.1 ✓) | PTY / streaming stdout (v2.2) |
| Git diff | `git diff` via Rust `get_git_diff` (v2.1 ✓) | Already real in desktop mode |
| Provider calls | Ollama: real HTTP ping. Others: mock. | Full streaming API calls (v2.2) |
| Folder picker | Native OS picker via `plugin-dialog` (v2.0 ✓) | Already real in desktop mode |
| Repo detection | Rust reads `.git/HEAD` directly (v2.0 ✓) | Already real in desktop mode |
| Platform info | `std::env::consts` from Rust (v2.0 ✓) | Already real in desktop mode |
| File editing | Not implemented | Guarded editor bridge (v2.2) |
| Daemon process | Browser singleton, no background process | Tauri sidecar process (v2.3) |
| Persistent storage | SQLite via Tauri in desktop mode (Phase A Sprint 1 ✓); UI not yet hydrated from store | TaskGraphEngine + orchestrator hydration (Phase A Sprint 2) |
| Remote runners | Not implemented | Remote runner protocol (v3.0) |
| Plugin execution | Not implemented | Sandboxed plugin runtime (v3.2) |

The architectural separation between `RuntimeEngine` (mechanics) and `OrchestratorRuntime` (coordination) is real and intentional — not a simulation concern. Both singletons, the context pattern, the event types, and the type system are production-quality foundations that real execution layers will build on top of.

---

## Target Architecture (Future State)

This section describes the architecture AgentOS is evolving toward, as defined in [docs/PRD.md](docs/PRD.md). **LocalStore** shipped in Phase A Sprint 1; modules marked **(planned)** are not yet implemented.

### Core Principle

**The task graph is the source of truth. The codebase is a projection of that graph.**

All UI views — Kanban, sessions, timeline, cost, worktrees — are **projections** of graph state and the append-only event log. They are not independent data sources.

### Target Layer Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  Agent Observatory — React UI                                    │
│  Graph · Timeline · Worktrees · Governance · Cost · Replay       │
│  (all views are projections — no independent mock state)         │
└──────────────────────────┬───────────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│  Context Providers (unchanged)                                   │
│  OrchestratorContext · RuntimeContext                            │
└──────────┬───────────────────────────────────┬───────────────────┘
           │                                   │
┌──────────▼──────────────┐        ┌───────────▼──────────────────┐
│  OrchestratorRuntime    │        │  RuntimeEngine               │
│  (evolves to graph      │        │  (session/worktree mechanics)│
│   executor coordinator) │        │                              │
└──────────┬──────────────┘        └───────────┬──────────────────┘
           │                                   │
           └──────────────┬────────────────────┘
                          │
           ┌──────────────▼───────────────────────────────────────┐
           │  TaskGraphEngine (planned)                           │
           │  src/runtime/taskGraphEngine.ts                      │
           │                                                      │
           │  • canonical store: epics, tasks, edges              │
           │  • executor: schedules ready nodes by dependency     │
           │  • ownership: agent role per node                    │
           │  • outcomes: patch refs, test results, costs         │
           └──────────┬───────────────────────┬───────────────────┘
                      │                       │
        ┌─────────────▼──────────┐  ┌─────────▼────────────────────┐
        │  EventLog (planned)    │  │  AgentOrganization (planned) │
        │  append-only store     │  │  planner · builder · reviewer│
        │  feeds Timeline+Replay │  │  · tester · research · docs  │
        └─────────────┬──────────┘  └─────────┬────────────────────┘
                      │                       │
        ┌─────────────▼───────────────────────▼────────────────────┐
        │  LocalStore (Sprint 1 ✓) — SQLite via Tauri              │
        │  graph nodes · events · sessions · (memory/cost planned) │
        └─────────────┬────────────────────────────────────────────┘
                      │
        ┌─────────────▼────────────────────────────────────────────┐
        │  DesktopBridge + ProviderRegistry (exists, extending)    │
        │  worktrees · allowlisted commands · LLM inference        │
        └──────────────────────────────────────────────────────────┘
```

### TaskGraphEngine (planned)

Central coordinator. Replaces the current pattern where `mockTasks`, `mockPlanning`, and `OrchestratorRuntime` simulation are disconnected.

Responsibilities:
- **Store** — epics, tasks, dependency edges, acceptance criteria, risk scores
- **Execute** — identify ready nodes (all dependencies satisfied), assign to agent roles
- **Update** — transition node status; create new nodes from test failures or replanning
- **Project** — expose read models for Kanban columns, graph SVG, timeline correlation

`OrchestratorRuntime` evolves from a self-contained simulator into a **graph executor coordinator** that delegates scheduling decisions to `TaskGraphEngine` and logs reasoning for every transition.

### Event Log (planned)

Append-only store of every runtime action. Unblocks:
- **Pillar 5** — Execution Timeline (durable, not capped at 60 items)
- **Pillar 6** — Replay Engine (reconstruct any decision chain)
- **Pillar 13** — Cost Accounting (aggregate token usage per event)

Event schema extends existing `TraceEvent` and `OrchestratorEvent` types. All agents, human overrides, and system actions write to the log before updating graph state.

### Projection Model

| View | Projection of |
|------|---------------|
| Task Board (Kanban) | Graph nodes filtered by status column |
| Runtime Graph (SVG) | Graph nodes + dependency edges |
| Orchestrator Timeline | Event log, global scope |
| Session Timeline | Event log, filtered by session/node |
| Worktree list | Graph nodes with active worktree binding |
| Cost dashboard | Event log aggregated by epic/task |
| Review panel | Graph node in `awaiting_review` state + patch ref |

Mock data in `src/data/` is replaced incrementally as each projection binds to real stores. See [docs/ROADMAP.md](docs/ROADMAP.md) Phase A → B migration plan.

### Agent Organization (planned)

Agents are **workers**, not user-facing chatbots. The user interacts with:
- Goal entry (starts planning)
- Observatory (supervises graph + timeline)
- Approval gates (merge, deploy, destructive actions)

Agent roles map to graph node types:

| Node type | Agent role |
|-----------|------------|
| epic (planning) | Planner |
| task (implementation) | Builder |
| task (review gate) | Reviewer |
| task (verification) | Tester |

Assignment is automatic from graph topology. `AgentsView` becomes a registry/health panel, not a persona picker.

### Governance Layer (planned)

Sits above `TaskGraphEngine` and `RuntimeEngine`:

- **Mode selector** — Manual / Assisted / Autonomous / Full Auto (per project)
- **Gate registry** — configurable checkpoints (merge, delete, install, deploy)
- **Audit trail** — every human override writes to event log with `decisionType: 'human_override'`

Existing `PermissionEscalationModal`, `TakeoverPanel`, and Rust allowlist become the enforcement layer for gates.

### Memora Integration Point (future)

Pillar 11 (Persistent Agent Memory) and Pillar 6 (Replay) expose a stable read API over the event log and graph store for external provenance systems (e.g., Memora). Not a Year 1 dependency.

### Migration Path

Current code is designed for incremental migration:

1. ~~Add `LocalStore` behind existing bridge interfaces~~ **Done (Sprint 1)**
2. Add `TaskGraphEngine`; wire `OrchestratorRuntime` to read from `LocalStore` instead of mocks
3. Replace `mockTasks` / `mockPlanning` imports in UI with graph projections
4. Add real agent loop calling `ProviderRegistry` inference
5. Wire governance gates to merge flow

No UI rewrite required — projections swap data sources behind the same components.

See [docs/GAP_ANALYSIS.md](docs/GAP_ANALYSIS.md) for current status per pillar.
