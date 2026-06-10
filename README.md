# AgentOS

**The Open Operating System for Autonomous Software Development**

[![CI](https://github.com/your-org/agentos/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/agentos/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.1.0--alpha-orange.svg)](CHANGELOG.md)

AgentOS enables developers to describe a software outcome and supervise a team of AI agents that plan, implement, review, test, and maintain the resulting system.

Unlike AI coding assistants that operate through chat, AgentOS provides a **persistent execution environment** where autonomous software workflows can be observed, controlled, replayed, and governed.

**The user remains the ultimate authority. Agents execute. Humans decide.**

---

## Category Positioning

| Product | What it is |
|---------|------------|
| **Cursor** | AI inside the editor |
| **Claude Code** | AI inside the terminal |
| **AgentOS** | AI inside the software development lifecycle |

AgentOS is not a chatbot wrapper. It is not an autonomous swarm. It is an open operating system for coordinating autonomous software work — built for solo developers who want agents to do real work without losing visibility or control.

**Documentation:** [PRD (future state)](docs/PRD.md) · [Gap analysis](docs/GAP_ANALYSIS.md) · [Roadmap](docs/ROADMAP.md) · [Architecture](ARCHITECTURE.md)

---

## Current Status

**v2.2 Alpha — Tauri-first desktop app with SQLite persistence (Phase A Sprint 1).**

The codebase is a high-fidelity **Agent Observatory** prototype with real desktop integrations and a durable local store. `npm run dev` launches the native Tauri app by default. The **task graph engine** and **real agent loop** are next per the [roadmap](docs/ROADMAP.md).

**Desktop mode** (`npm run dev`) — default; requires Rust:
- SQLite store at `app_data_dir/agentos.db` (projects, graph nodes/edges, events, sessions)
- Boot initializes the store before the Observatory renders
- Native folder picker, real git validation, worktree creation, allowlisted commands, live diffs
- Ollama availability check via HTTP ping to `localhost:11434`
- Storage diagnostics in Runtime → Connection

**Browser preview** (`npm run dev:web`) — Vite-only UI with simulated runtime and no persistence. Useful for UI-only work or CI.

The following remain simulated or incomplete:
- LLM agent execution (no real planner/builder/reviewer loop)
- Task graph as source of truth (Kanban and plans still use mock data; store is ready)
- UI hydration from store (orchestrator not yet wired to `LocalStore`)
- Background daemon (browser singleton only)
- Replay engine (UI stubs only)

> **Requires Rust to build in desktop mode.** See [Desktop Setup](#desktop-setup) below.

---

## Screenshots

> Screenshots are pending. Run `npm run dev` to see the live demo.
> See [`docs/media/`](docs/media/README.md) for the planned screenshot list.

---

## What is AgentOS?

AgentOS models a local software organization. You describe a goal. A planner decomposes it into a **task graph**. Specialized agents execute work in isolated worktrees. You supervise through the Observatory — not by chatting with agents, but by watching the graph, timeline, diffs, and approval gates.

You can:
- describe a project outcome and generate a structured plan
- watch agents work across isolated worktrees and branches
- inspect the task graph, dependencies, and execution timeline
- review diffs and approve merges through governance gates
- override any assignment, escalate any blocker, or pause any session
- trace every decision through the orchestration reasoning log

---

## Core Philosophy

**Goals, not prompts.** You describe outcomes. The task graph is the source of truth. The codebase is a projection of that graph.

**Agents are workers, not products.** You supervise the organization. You do not chat with most agents directly.

**Controlled autonomy.** Autonomy is adjustable (Manual → Assisted → Autonomous → Full Auto). Governance is never optional.

**Interpretable orchestration.** Every assignment, queue delay, and blocker has a logged reason. No black boxes.

**Local-first.** The runtime runs on your machine. No cloud account required. Works on a laptop, in an enterprise network, on an airplane.

---

## Runtime Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Agent Observatory (React UI)                  │
│  Task Graph · Timeline · Worktrees · Governance · Cost        │
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
│ • blockers        │           │ • worktree lifecycle             │
│ • timeline        │           │                                  │
└───────────────────┘           └──────────┬──────────────────────┘
                                           │
                               ┌───────────▼──────────┐
                               │   DesktopBridge       │
                               │   ProviderRegistry    │
                               │   (Tauri / Web)       │
                               └──────────────────────┘
```

State flows in one direction: runtime singletons → context subscriptions → React UI. See [ARCHITECTURE.md](ARCHITECTURE.md) for current implementation and target architecture (Task Graph Engine, event log, projection model).

---

## Key Concepts

| Concept | Description |
|---|---|
| **Goal** | A natural-language software outcome the developer wants built |
| **Task Graph** | The canonical DAG of epics, tasks, dependencies, and outcomes |
| **Epic** | A major feature area (e.g., Authentication, Billing) |
| **Task** | A unit of work with acceptance criteria, owned by a graph node |
| **Agent** | A specialized worker (planner, builder, reviewer, tester) — not a chatbot |
| **Session** | One agent executing one graph node in one worktree |
| **Worktree** | An isolated git branch snapshot for a session |
| **Observatory** | The supervision UI — graph, timeline, diffs, governance, cost |
| **Governance** | Adjustable autonomy modes and approval gates |
| **Provider** | An LLM backend (Anthropic, OpenAI, Ollama, etc.) |

---

## Agent Roles

| Role | Responsibility |
|---|---|
| `planner` | Decomposes goals into epics and tasks; updates scope |
| `builder` | Implements graph nodes in isolated worktrees |
| `reviewer` | Audits patches; approves or rejects |
| `tester` | Runs tests; failures generate new graph nodes |
| `refactorer` | Restructures code without changing behaviour |
| `architect` | Designs system-level solutions |

---

## Observatory Views

- **Task Graph** — dependency structure of all work (source of truth)
- **Plan** — active runtime plan with delegation chain and blockers
- **Timeline** — global event feed across all sessions
- **Sessions** — live agent execution detail with diffs and tests
- **Reviews** — active review sessions with approval gates
- **Reasoning** — chronological log of every orchestration decision
- **Governance** — autonomy mode and approval gate configuration

---

## Local Setup

```bash
git clone https://github.com/your-org/agentos
cd agentos
npm install
npm run dev
```

Opens the native AgentOS window (Vite serves the UI at `http://localhost:5173` in the background). The demo orchestration still uses mock data until TaskGraphEngine lands.

**Requirements:** Node.js 18+, npm 9+, **Rust** (for default desktop mode)

**Stack:** React 19, TypeScript 6, Vite 8, Tailwind CSS v3, Framer Motion 12, Tauri v2 (desktop)

### Available scripts

```bash
npm run dev        # Tauri desktop app (default — requires Rust)
npm run dev:web    # Vite browser preview only (no persistence)
npm run build      # typecheck + production build
npm run typecheck  # typecheck only (no build output)
npm run lint       # ESLint
npm run preview    # serve production build locally
npm run clean      # remove dist/
npm run tauri:dev  # alias for npm run dev
npm run tauri:build # desktop release build
```

### Environment

Copy `.env.example` to `.env` for provider configuration. No keys are required to run the demo.

---

## Desktop Setup

`npm run dev` is the desktop app. Rust is required.

**Prerequisites:**
1. Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
2. Install dependencies: `npm install`
3. On macOS/Linux: no extra steps. On Windows: install WebView2.

**Run:**
```bash
npm run dev
```

This launches the native window with SQLite persistence, real worktree creation, allowlisted command execution, live git diffs, and Ollama detection. Use `npm run dev:web` for a browser-only preview without persistence.

---

## Known Limitations

These are known boundaries of the current alpha, not bugs:

| Limitation | Notes |
|---|---|
| No real LLM agent loop | Session output is simulated. Provider bridges exist for health checks only. |
| Task graph not canonical | Kanban and plans use separate mock data. `LocalStore` ready; TaskGraphEngine next. |
| UI not hydrated from store | SQLite persists in desktop mode; orchestrator still loads mocks on boot. |
| No replay engine | UI stubs only. Planned for Year 2. |
| No agent memory | Planned for Year 2; Memora integration point documented in PRD. |
| PTY streaming | Commands run via allowlist; no interactive terminal yet. |
| No daemon process | Browser singleton. Sidecar planned. |
| Single machine only | Remote runners explicitly deferred beyond 24-month horizon. |

See [docs/GAP_ANALYSIS.md](docs/GAP_ANALYSIS.md) for the full pillar-by-pillar status.

---

## Project Structure

```
src/
├── components/
│   ├── layout/          # AppShell, Sidebar, TopBar
│   ├── orchestration/   # Graph, Plan, Sessions, Queue, Reviews, Reasoning, Timeline
│   ├── onboarding/      # First-run experience
│   ├── roadmap/         # Roadmap view
│   ├── sessions/        # SpawnSessionModal, AgentSession, Timeline
│   ├── workspace/       # WorkspaceManager, WorkspaceCard
│   ├── runtime/         # RuntimeView, diagnostics, governance
│   ├── dashboard/       # Mission Control overview
│   ├── tasks/           # TaskBoard (graph projection, in progress)
│   ├── agents/          # Agent registry view
│   └── shared/          # Design system components
├── context/             # OrchestratorContext, RuntimeContext
├── runtime/             # RuntimeEngine, OrchestratorRuntime, providers, desktop bridge, LocalStore
├── data/                # Mock data (being replaced by graph projections)
├── types/               # Shared TypeScript types (incl. graph.ts)
├── hooks/               # usePersistence (boot-time store init)
docs/
├── PRD.md               # Future-state product requirements
├── GAP_ANALYSIS.md      # Current vs target status
└── ROADMAP.md           # Pillar-based build plan
src-tauri/               # Rust: worktrees, commands, git diff
```

---

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for the full pillar-based plan, or the Roadmap view inside the app.

| Phase | Status | Focus |
|---|---|---|
| Foundation (v0.x–v2.1) | Done | UI shell, orchestration, desktop bridge, real worktrees |
| Phase A — Foundation | Current | Persistence ✓ (Sprint 1); task graph engine, goal entry |
| Phase B — Year 1 | Upcoming | Real agent loop, governance, merge approval |
| Phase C — Year 2 | Future | Replay, memory, skills executor |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, architecture walkthrough, and contribution workflow.

See [ARCHITECTURE.md](ARCHITECTURE.md) for runtime layers and target architecture.

See [docs/PRD.md](docs/PRD.md) for the future-state product vision.

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## Security

See [SECURITY.md](SECURITY.md) for the responsible disclosure policy and local execution warnings.

---

## Design Principles

- **The task graph is the source of truth.** Everything else is a projection.
- **Agents are workers.** The user supervises outcomes, not conversations.
- **Human override is always possible.** No orchestration decision is irreversible without human confirmation.
- **Every decision is explainable.** If the runtime makes a choice, it logs the reason.
- **Honest about what is real.** The simulation is documented. Limitations are explicit.

---

## License

Apache 2.0 — see [LICENSE](LICENSE).
