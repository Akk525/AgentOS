# AgentOS

**Local-first runtime environment for steerable coding agents.**

[![CI](https://github.com/your-org/agentos/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/agentos/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.0.0--alpha-orange.svg)](CHANGELOG.md)

AgentOS is an open-source operating environment that lets you supervise, steer, and understand intelligent coding agents. It is not a chatbot wrapper. It is not an autonomous swarm. It is a controlled delegation environment — built for developers who want agents to do real work without losing visibility or control.

---

## Current Status

**v2.0 Alpha — desktop shell + first real integrations.**

AgentOS now runs in two modes:

**Browser mode** (`npm run dev`) — full UI with simulated runtime. No dependencies. No API keys. Good for exploring the product.

**Desktop mode** (`npm run tauri:dev`) — Tauri-wrapped desktop app with real local integrations:
- Native folder picker for workspace selection
- Real `.git/HEAD` detection (read-only) via Rust
- Real Ollama availability check via HTTP ping to `localhost:11434`
- Environment mode indicator in the Runtime view

The following remain simulated in v2.0:
- LLM session execution (no real agents running)
- Git worktree creation (no filesystem writes)
- Background daemon (no sidecar process)

This is intentional. The architecture is designed so that real execution layers slot in behind the same interfaces without changing the UI or orchestration layers. See the [Roadmap](#roadmap) for planned milestones.

> **Requires Rust to build in desktop mode.** See [Desktop Setup](#desktop-setup) below.

---

## Screenshots

> Screenshots are pending. Run `npm run dev` to see the live demo.
> See [`docs/media/`](docs/media/README.md) for the planned screenshot list.

---

## What is AgentOS?

AgentOS models a local software organisation. Multiple agents run in parallel sessions, coordinate through a planner, submit patches for review, and surface every decision they make. The human remains in control at all times.

You can:
- watch agents work in real time across workspaces and branches
- understand why orchestration decisions were made (assignments, queues, blockers)
- override any assignment, escalate any blocker, or pause any session
- review patches before they merge
- trace every event through a live orchestration feed

---

## Core Philosophy

**Controlled autonomy.** Agents should never have arbitrary execution authority. Every significant action is supervised, logged, and overridable.

**Interpretable orchestration.** The runtime should explain itself. Every assignment, queue delay, and blocker has a logged reason. No black boxes.

**Local-first.** The runtime runs on your machine. No cloud account required. No data leaves without your knowledge.

**Supervised delegation.** Agents are delegated work, not given authority. The planner session decomposes tasks. Worker sessions execute. Review sessions audit. You decide what merges.

---

## Runtime Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Layer (React)                         │
│  Dashboard · Orchestration · Plan · Reviews · Reasoning         │
└───────────────────────┬─────────────────────────────────────────┘
                        │ useOrchestrator / useRuntime
┌───────────────────────▼─────────────────────────────────────────┐
│                   Context Providers                             │
│  OrchestratorContext          RuntimeContext                    │
└───────┬───────────────────────────────────┬─────────────────────┘
        │ subscribe()                       │ subscribe()
┌───────▼──────────┐             ┌──────────▼──────────────────────┐
│ OrchestratorRuntime│           │     RuntimeEngine               │
│                   │           │                                  │
│ • activeSessions  │           │ • session state                  │
│ • runtimePlans    │           │ • event bus                      │
│ • reasoning       │           │ • patch lifecycle                │
│ • blockers        │           │ • worktree simulation            │
│ • timeline        │           │                                  │
└───────────────────┘           └──────────┬──────────────────────┘
                                           │
                               ┌───────────▼──────────┐
                               │   RuntimeDaemon       │
                               │   RuntimeBridge       │
                               │   ProviderBridge      │
                               │   ProviderRegistry    │
                               └──────────────────────┘
```

State flows in one direction: runtime singletons → context subscriptions → React UI. There is no global Redux store. Each runtime singleton manages its own state and notifies listeners on every change.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full event flow and layer responsibilities.

---

## Key Concepts

| Concept | Description |
|---|---|
| **Session** | One agent executing one task in one branch |
| **Workspace** | A repository mounted into the runtime |
| **Worktree** | An isolated branch snapshot for a session |
| **Plan** | A decomposed task graph created by a planner session |
| **Subtask** | A unit of delegated work within a plan |
| **Patch** | The diff a session produces, tracked through a lifecycle |
| **Review** | A separate reviewer session auditing a patch |
| **Blocker** | A dependency or resource constraint halting a session |
| **Reasoning** | A logged explanation for every orchestration decision |
| **Provider** | An LLM backend (Anthropic, OpenAI, Ollama) |

---

## Session Roles

| Role | Responsibility |
|---|---|
| `planner` | Decomposes tasks, assigns subtasks, coordinates reviewers |
| `debugger` | Diagnoses and patches bugs |
| `test-writer` | Generates and updates test suites |
| `refactorer` | Restructures code without changing behaviour |
| `reviewer` | Audits patches, flags issues, approves or rejects |
| `architect` | Designs system-level solutions and migration plans |

---

## Orchestration Views

- **Plan** — active runtime plan with delegation chain and blocker status
- **Graph** — SVG session dependency graph with provider bindings
- **Sessions** — live table of all active sessions with status and stats
- **Queue** — sessions waiting for provider capacity or dependencies
- **Reviews** — active review sessions with comment feeds
- **Reasoning** — chronological log of every orchestration decision
- **Timeline** — global event feed across all sessions

---

## Local Setup

```bash
git clone https://github.com/your-org/agentos
cd agentos
npm install
npm run dev
```

Opens at `http://localhost:5173`. The demo runtime starts automatically with a populated orchestration: 6 sessions, 1 active plan, live review chain, reasoning log.

**Requirements:** Node.js 18+, npm 9+

**Stack:** React 19, TypeScript 6, Vite 8, Tailwind CSS v3, Framer Motion 12

### Available scripts

```bash
npm run dev        # development server (browser mode)
npm run build      # typecheck + production build
npm run typecheck  # typecheck only (no build output)
npm run lint       # ESLint
npm run preview    # serve production build locally
npm run clean      # remove dist/
npm run tauri:dev  # desktop app (requires Rust — see below)
npm run tauri:build # desktop release build
```

### Environment

Copy `.env.example` to `.env` for provider configuration. No keys are required to run the demo.

---

## Desktop Setup

To run AgentOS as a native desktop app with real local integrations:

**Prerequisites:**
1. Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
2. Install Tauri CLI and dependencies: `npm install`
3. On macOS/Linux: no extra steps. On Windows: install WebView2.

**Run:**
```bash
npm run tauri:dev
```

This launches the full React UI inside a native window, with:
- Real folder picker when mounting workspaces
- Real `.git/HEAD` branch detection
- Real Ollama availability ping (`localhost:11434`)
- Environment badge in the Runtime view showing "Desktop mode"

The browser `npm run dev` workflow continues to work unchanged — all real integrations fall back to safe simulated responses in the browser via `WebBridge`.

---

## Known Limitations

These are known boundaries of the current prototype, not bugs:

| Limitation | Notes |
|---|---|
| No real LLM calls | All session output is simulated. Provider bridges exist but are mocked. |
| No real PTY execution | Shell commands are not executed. Planned for v2.0 with Tauri. |
| No real git worktrees | Branches are simulated. Real isolation planned for v2.2. |
| No persistent storage | State resets on page reload. No database. |
| No daemon process | The daemon is a browser singleton. Tauri IPC planned for v2.1. |
| Single machine only | No remote runner support yet. Planned for v3.0. |
| No plugin system | Plugin API planned for v3.2. |

---

## Project Structure

```
src/
├── components/
│   ├── layout/          # AppShell, Sidebar, TopBar
│   ├── orchestration/   # Graph, Plan, Sessions, Queue, Reviews, Reasoning, Timeline
│   ├── onboarding/      # First-run experience
│   ├── roadmap/         # Roadmap view
│   ├── sessions/        # SpawnSessionModal, SessionArchivePanel
│   ├── workspace/       # WorkspaceManager, WorkspaceCard
│   ├── runtime/         # RuntimeView, diagnostics, status bar
│   ├── dashboard/       # Dashboard overview
│   ├── tasks/           # TaskBoard, NewTaskModal
│   ├── agents/          # AgentsView
│   ├── command/         # CommandPalette
│   └── shared/          # NotificationToast, ShortcutsOverlay
├── context/
│   ├── OrchestratorContext.tsx   # Orchestration state + actions
│   └── RuntimeContext.tsx        # Runtime state + actions
├── runtime/
│   ├── runtimeEngine.ts          # Core event-driven engine
│   ├── runtimeDaemon.ts          # Daemon simulation
│   ├── runtimeBridge.ts          # Bridge between client and engine
│   ├── runtimeClient.ts          # Public client API
│   ├── runtimeReducer.ts         # State reducer
│   ├── runtimeTypes.ts           # Event/command type definitions
│   ├── orchestratorRuntime.ts    # Orchestration singleton
│   └── providers/                # Provider registry and bridges
├── data/
│   ├── mockOrchestration.ts      # Demo orchestration data
│   └── mockPlanning.ts           # Demo planning / reasoning data
├── hooks/
│   └── useFirstRun.ts
├── types/
│   └── index.ts                  # All shared TypeScript types
└── lib/
    └── utils.ts
```

---

## Roadmap

See the Roadmap view inside the app, or read the summary:

| Version | Status | Focus |
|---|---|---|
| v0.x | Done | Foundation — runtime, sessions, workspaces |
| v1.0 | Done | Orchestration — planning, delegation, reasoning |
| v1.1 | Done | OSS Readiness — onboarding, docs, contributor experience |
| v1.2 | Done | Repo credibility — license, CI, changelog, security |
| v2.0 | Upcoming | Real PTY execution |
| v2.1 | Upcoming | Tauri desktop runtime |
| v2.2 | Upcoming | Real git worktrees |
| v3.0 | Future | Remote runner support |
| v3.1 | Future | MCP integration |
| v3.2 | Future | Plugin ecosystem |
| v4.0 | Future | Session replay engine |
| v4.x | Future | Runtime APIs |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, architecture walkthrough, and contribution workflow.

See [ARCHITECTURE.md](ARCHITECTURE.md) for a detailed explanation of the runtime layers.

See [CHANGELOG.md](CHANGELOG.md) for the version history.

---

## Security

See [SECURITY.md](SECURITY.md) for the responsible disclosure policy and local execution warnings.

---

## Design Principles

- **Never break controlled autonomy.** Agents should not have arbitrary execution authority.
- **Every decision is explainable.** If the runtime makes a choice, it logs the reason.
- **Human override is always possible.** No orchestration decision is irreversible without human confirmation.
- **The runtime does not surprise you.** Motion is calm. Information is readable. Density is purposeful.
- **Honest about what is real.** The simulation is documented. Limitations are explicit. No fake demos.

---

## License

Apache 2.0 — see [LICENSE](LICENSE).
