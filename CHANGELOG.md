# Changelog

All notable changes to AgentOS are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- **TaskGraphEngine (Phase A Sprint 2)** — singleton graph coordinator over `LocalStore` with ready/blocked executor, demo seed, and `TaskGraphContext`
- **Graph projections** — `graphNodesToTasks()` for Kanban, `graphToRuntimePlan()` for Plan view
- **Durable orchestrator timeline** — hydrates from SQLite on boot; `pushEvent()` dual-writes to store (no 60-item cap)
- **Demo graph seed** — seeds auth refactor plan from `mockPlanning` on first empty store
- **In-memory LocalStore** — full Map-backed implementation for `npm run dev:web`
- **SQLite local store (Phase A Sprint 1)** — `rusqlite` schema v1 with `projects`, `graph_nodes`, `graph_edges`, `events`, `sessions` tables in `src-tauri/src/db/`
- **Tauri store IPC** — 13 commands in `store_commands.rs` (`store_init`, project/node/edge CRUD, `store_append_event`, session snapshots)
- **TypeScript LocalStore** — `getLocalStore()` factory in `src/runtime/store/` with `tauriLocalStore` (desktop) and `memoryLocalStore` (browser fallback)
- **Graph entity types** — `Project`, `GraphNode`, `GraphEdge`, `StoredEvent`, `StoredSession` in `src/types/graph.ts`
- **Tauri-first boot gate** — `usePersistence` hook initializes store before Observatory renders; first-run `system_event` proves persistence
- **Storage diagnostics** — Runtime → Connection panel shows DB path, schema version, table counts
- **`LogsView`** — stub component wrapping `RuntimeLogPanel` (fixes broken nav import)
- **Web fallback banner** — dismissible notice in browser preview mode

### Changed
- **`npm run dev`** now launches `tauri dev` (desktop app is the default dev entry point)
- **`npm run dev:web`** added for Vite-only browser preview
- `tauri.conf.json` `beforeDevCommand` uses `npm run dev:web` to avoid recursive dev script
- **TaskBoard** and **RuntimePlanView** read from graph projections when store is available
- **Storage diagnostics** show active project title and ready/blocked node counts

### Notes
- Dashboard, RuntimeStatusBar, and AgentSession still use `mockTasks`; sessions/reviews remain simulated
- Desktop mode stores data in `app_data_dir/agentos.db`; browser preview uses in-memory store (resets on reload)

---

## [2.2.0] — 2026-06-11

Phase A Sprint 1 release. See [Unreleased] above for details (to be tagged).

---

## [2.1.0] — 2026-05-18

### Added
- **Real git worktree creation** — Rust `create_worktree` command runs `git worktree add -b <branch> <path>` under `<repo>/.agentos/worktrees/`; full input validation (branch name, path traversal prevention, existing-worktree detection)
- **Allowlisted command execution** — Rust `run_workspace_command` enforces an explicit allowlist (`git status`, `git diff`, `git log`, `ls`, `pwd`, `npm test`, `pnpm test`, `yarn test`) and blocks dangerous patterns (`rm`, `sudo`, `;`, `&&`, `||`, `curl`, etc.)
- **Git diff reading** — Rust `get_git_diff` runs `git diff` in any worktree path; returns raw diff, changed file list, and insertion/deletion counts
- **Command risk classification** — TypeScript layer classifies commands as `safe` / `medium` / `blocked` before sending to the bridge; medium/blocked commands trigger `PermissionEscalationModal`
- **Real command streaming** — `runTerminalCommand` now routes through the bridge and emits `TERMINAL_APPENDED` lines for real output; test commands trigger `TEST_RUN_COMPLETE`
- **Diff tab in AgentSession** — New "Diff" tab renders `RawDiffPanel` showing live `git diff` output with syntax colouring, file list, and line counts
- **Real worktree error handling in SpawnSessionModal** — Launch sequence watches `lastWorktreeError` from RuntimeContext; marks the failed step, shows error message, and offers retry
- `src/components/review/RawDiffPanel.tsx` — standalone diff viewer connected to `getGitDiff()` and `gitDiff` state
- New runtime state: `gitDiff`, `lastWorktreeError`, `commandRunning`
- New runtime events: `WORKTREE_FAILED`, `SESSION_LAUNCH_FAILED`, `COMMAND_STARTED`, `COMMAND_OUTPUT`, `COMMAND_COMPLETED`, `GIT_DIFF_UPDATED`
- New runtime commands: `RUN_REAL_COMMAND`, `GET_GIT_DIFF`

### Changed
- `cmdSpawnSession` in RuntimeEngine — now `async`; calls `bridge.createWorktree()` before proceeding; emits `SESSION_LAUNCH_FAILED` on failure; never pretends a session launched if worktree creation failed
- `cmdRunTerminalCommand` — now classifies command risk first; routes safe commands through `cmdRunRealCommand`; routes unknown commands to escalation modal
- `cmdCreateWorktree` — now `async`; calls real bridge; emits `WORKTREE_FAILED` with error message if creation fails
- RuntimeEngine tracks `activeWorktreePath` and `activeRepoPath` for command context
- `package.json` version bumped to `2.1.0` (pending)

### Safety
- All new Rust commands validate inputs server-side (allowlist, pattern blocklist, name sanitisation)
- `create_worktree` uses `std::fs::create_dir_all` only; no destructive filesystem ops
- `.agentos/worktrees/` is the only writable location; worktree names are restricted to `[a-zA-Z0-9_-]`
- File editing, PTY sessions, and sidecar agents are still not implemented

---

## [2.0.0] — 2026-05-18

### Added
- **Desktop bridge abstraction** — `src/runtime/desktop/` with `DesktopBridge` interface, `TauriBridge` (Tauri IPC), `WebBridge` (browser fallback), and `desktopBridge.ts` factory
- **Tauri backend** — `src-tauri/` with `validate_repo` and `get_platform` Rust commands (read-only)
- **Native folder picker** — `WorkspaceMountModal` gains a "Pick folder" button that opens a native OS folder chooser in desktop mode
- **Real git repo detection** — Rust `validate_repo` reads `.git/HEAD` directly; WebBridge falls back to heuristic simulation in the browser
- **Environment banner** — `RuntimeView` now shows a persistent "Desktop mode" or "Browser preview" indicator
- `package.json` — added `tauri:dev` and `tauri:build` scripts; added `@tauri-apps/api`, `@tauri-apps/plugin-dialog`, `@tauri-apps/cli` dependencies
- `README.md` — Desktop Setup section with Rust install instructions
- `ARCHITECTURE.md` — Desktop bridge layer added to the layer diagram, key file map, and simulated vs real table
- `SECURITY.md` — updated to reflect v2.0 real integrations and read-only constraint

### Changed
- `workspaceValidator.ts` — now delegates to `getDesktopBridge()` instead of internal heuristics; bridge provides both real (Tauri) and simulated (web) responses through the same interface
- `package.json` version — bumped to `2.0.0`
- All v2.0 local integrations are **strictly read-only** — no filesystem writes, no terminal execution, no worktree creation

---

## [1.3.0] — 2026-05-18

### Added
- `src/pages/Landing.tsx` — full-screen marketing landing page with live session preview, feature grid, architecture block, roadmap strip, and OSS CTA
- `public/og-image.svg` — 1200×630 social card for GitHub/Twitter/HN
- `index.html` — Open Graph and Twitter Card meta tags
- `docs/media/social/README.md` — launch asset inventory and messaging

### Changed
- Agent name "Refactor" → "Rex" across `mockOrchestration.ts`, `mockPlanning.ts`, `orchestratorRuntime.ts`
- Sidebar version label bumped to `v1.3.0-alpha`

---

## [1.2.0] — 2026-05-17

### Added
- `LICENSE` (Apache 2.0)
- `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1
- `SECURITY.md` — responsible disclosure, local execution warnings, controlled autonomy positioning
- `.env.example` — provider config and runtime settings with documentation
- `.github/workflows/ci.yml` — automated lint, typecheck, and build on push/PR
- `CHANGELOG.md` — this file
- `docs/media/` — placeholder directory for screenshots and demo GIFs
- `package.json` — added `typecheck` and `clean` scripts
- `README.md` — added current status badge strip, known limitations section, screenshots placeholder section

### Changed
- `README.md` — clarified simulation boundaries; strengthened controlled autonomy positioning
- `ARCHITECTURE.md` — added architecture boundaries section noting what is simulated vs real

---

## [1.1.0] — 2026-05-18

### Added
- First-run onboarding overlay (`OnboardingOverlay`) — 3-step cinematic boot sequence
- `useFirstRun` hook — localStorage-based first-run detection
- Keyboard shortcuts overlay (`ShortcutsOverlay`) — triggered by `?` key
- `RoadmapView` — 11-phase development timeline with current/done/upcoming/future states
- `Roadmap` nav item in sidebar (Map icon)
- `README.md` — full rewrite with architecture diagram, key concepts, session roles, project structure
- `CONTRIBUTING.md` — local setup, architecture overview, naming conventions, PR checklist
- `ARCHITECTURE.md` — detailed layer diagram, event flow traces, file map, design constraints
- `.github/ISSUE_TEMPLATE/bug_report.md`
- `.github/ISSUE_TEMPLATE/feature_request.md`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `'roadmap'` added to `View` type

### Changed
- `AppShell` — wired onboarding, shortcuts overlay, `?` and Escape keyboard handlers
- `Sidebar` — live agent count and queue depth from `useOrchestrator()` in footer

---

## [1.0.0] — 2026-05-17

### Added
- Planning layer: `PlannerSession`, `RuntimePlan`, `PlanSubtask`, `DelegationChain`
- `RuntimePlanView` — delegation chain tree with planner node, subtask rows, blocker panel
- `RuntimeReasoningPanel` — chronological log of every orchestration decision
- `RuntimeBlocker` system — dependency, provider overload, merge conflict, permission, stalled, review timeout
- `mockPlanning.ts` — planner session "Lyra", 4-subtask auth refactor plan, 6 reasoning entries, 3 blockers
- Human override controls: `escalateBlocker`, `overrideAssignment` on `OrchestratorContext`
- `OrchestratorRuntime` extended with `runtimePlans`, `reasoning`, `blockers` state
- `'planning'` status added to `OrchestratedSessionStatus`
- 5 new `OrchestratorEventType` values: `plan_created`, `subtask_assigned`, `blocker_detected`, `blocker_resolved`, `escalated`
- Plan and Reasoning tabs added to `OrchestrationView`
- `orchestratorRuntime.escalateBlocker()` and `overrideAssignment()` public methods

---

## [0.9.0] — 2026-05-17

### Added
- Multi-session orchestration: 5 concurrent sessions (Cipher, Echo, Atlas, Refactor, Nexus)
- `OrchestratorRuntime` singleton — independent of `RuntimeEngine`, observer pattern
- `OrchestratorContext` — provides orchestration state to React tree
- `mockOrchestration.ts` — sessions, dependencies, queue, load, reviews, timeline
- `RuntimeGraph` — SVG-based session dependency graph with provider bindings
- `SessionCluster` — live session table with status, stats, phase indicator
- `RuntimeQueuePanel` — queue entries, provider capacity bars, saturation banners
- `ReviewSessionPanel` — active review sessions with animated comment feed
- `OrchestratorTimeline` — chronological event feed across all sessions
- `OrchestrationView` — tabbed container (Graph | Sessions | Queue | Reviews | Timeline)
- `'orchestration'` added to sidebar nav and `View` type
- Session dependency model: `reviews`, `blocked_by`, `depends_on`, `attached_to`
- Runtime load simulation: CPU, memory, token throughput, provider capacity tickers
- Review handoff lifecycle: `awaiting_review` → `reviewing` → `approved_with_changes`

---

## [0.8.0] — 2026-05-16

### Added
- `SpawnSessionModal` — 5-step wizard (workspace → agent → branch → config → summary → animated launch)
- Session launch sequence — 6-step animated boot (validate, worktree, runtime, provider, agent, session)
- `LiveWorktree` simulation — `WORKTREE_CREATED` events with creating → active lifecycle
- `PatchLifecycle` state machine — draft → updating → testing → awaiting_review → approved/rejected/archived
- `WorkspaceHistory` tracking
- `SessionArchivePanel` rewrite — grouped by workspace, collapsible, hover-reveal actions
- `WorkspaceCard` — Spawn session button
- New runtime commands: `SPAWN_SESSION`, `CREATE_WORKTREE`
- New runtime events: `WORKTREE_CREATED`, `SESSION_SPAWNED`, `PATCH_LIFECYCLE_CHANGED`
- v0.8 command palette commands: spawn session (⌃S), create worktree

---

## [0.7.0] — 2026-05-15

### Added
- `RuntimeView` — tabbed panel (Connection | Providers | Logs)
- v0.7 command palette commands: ping providers, run diagnostics, validate repo, daemon logs
- `onViewChange` passed through `CommandPalette`

### Fixed
- `AppShell` — route `'runtime'` to `RuntimeView` instead of `RuntimeConnectionPanel`
- `providerRegistry.ts` — fixed return type annotation for `pingAll` and `ping`
- `workspaceValidator.ts` — removed unused `RepoValidationState` import

---

## [0.5.0] — 2026-05-14

### Added
- Full workspace management system (`WorkspaceManager`, `WorkspaceCard`)
- `WorkspaceMountModal` — mount local repositories
- `PermissionEscalationModal` — runtime permission request handling
- `RuntimeStatusBar` — always-visible runtime state strip
- `NotificationToast` — runtime notification system
- `CommandPalette` (⌘K) — searchable runtime commands
- Runtime diagnostics system (`runDiagnostics`)
- Provider health monitoring (`pingAllProviders`, `testProvider`)
- `LogsView` — runtime event log

---

## [0.1.0] — 2026-05-10

### Added
- Initial project scaffold (Vite + React + TypeScript + Tailwind CSS v3)
- `AppShell` layout — sidebar, top bar, main content area
- `Sidebar` with glassmorphism design system
- `Dashboard` view
- `TaskBoard` — Kanban-style task management
- `AgentSession` — session detail view with trace, patches, tests
- `AgentsView`, `SkillsView`, `ProvidersView`, `SettingsView`
- `RuntimeEngine` — event-driven singleton
- `RuntimeDaemon` — daemon simulation
- `RuntimeBridge` — engine ↔ context bridge
- `RuntimeClient` — public command API
- `RuntimeContext` — React provider with useReducer
- `ProviderBridge`, `ProviderRegistry` — provider abstraction layer
- Custom `crimson` colour scale in Tailwind config
- `glass`, `glass-strong`, `grid-overlay`, `scrollbar-thin` CSS utilities
- Dark glassmorphism design system
- Framer Motion throughout — AnimatePresence, spring transitions, layout animations
