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
| `src-tauri/src/main.rs` | Tauri application entry point |
| `src-tauri/src/commands.rs` | Rust command handlers (read-only) |
| `src-tauri/tauri.conf.json` | Window config, bundle settings, plugins |

---

## Design Constraints

**No arbitrary agent execution.** The runtime simulates agent behaviour but does not call real LLM APIs or execute real shell commands in this version. All session events are scripted simulations. PTY execution is a future milestone.

**Desktop bridge is the only cross-environment seam.** In v2.0, all real system access routes through `getDesktopBridge()` in `src/runtime/desktop/`. UI and runtime layers must never import `@tauri-apps/api` directly. The bridge factory resolves to `TauriBridge` (real Tauri IPC) when `window.__TAURI__` is present, and to `WebBridge` (safe mocks) otherwise. Adding a new real system capability means adding a method to `DesktopBridge`, implementing it in both bridges, and connecting it at the relevant call site — nothing else changes.

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
| Persistent storage | None — state resets on reload | SQLite via Tauri (v2.3) |
| Remote runners | Not implemented | Remote runner protocol (v3.0) |
| Plugin execution | Not implemented | Sandboxed plugin runtime (v3.2) |

The architectural separation between `RuntimeEngine` (mechanics) and `OrchestratorRuntime` (coordination) is real and intentional — not a simulation concern. Both singletons, the context pattern, the event types, and the type system are production-quality foundations that real execution layers will build on top of.
