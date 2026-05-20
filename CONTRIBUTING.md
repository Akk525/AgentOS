# Contributing to AgentOS

AgentOS is in active development. Contributions are welcome — bugs, features, docs, and design feedback.

---

## Local Setup

```bash
git clone https://github.com/your-org/agentos
cd agentos
npm install
npm run dev          # development server at localhost:5173
npm run build        # production build (also runs tsc)
npm run lint         # ESLint
```

The app runs fully in the browser — no backend required. All runtime state is simulated in `src/runtime/` and `src/data/`.

---

## Architecture Overview

Read [ARCHITECTURE.md](ARCHITECTURE.md) for a full walkthrough. The key principle: **runtime singletons own state and notify React contexts via observer subscriptions.** There is no Redux, no Zustand, no global atoms.

```
RuntimeEngine / OrchestratorRuntime  →  Context Provider  →  React UI
       (singleton)                       (useState + subscribe)
```

---

## Adding a New View

1. Create `src/components/your-view/YourView.tsx`
2. Add the view name to the `View` type in `src/App.tsx`
3. Add a `case 'your-view'` in `AppShell.tsx → renderView()`
4. Add a nav entry in `src/components/layout/Sidebar.tsx → STATIC_NAV`

---

## Adding a New Runtime Event

1. Add the event type string to `RuntimeEventType` in `src/runtime/runtimeTypes.ts`
2. Emit it from `RuntimeEngine` via `this.emit({ type: 'YOUR_EVENT', ... })`
3. Handle it in `RuntimeContext.tsx → useEffect` dispatch block
4. Add to reducer in `src/runtime/runtimeReducer.ts` if it mutates state

---

## Adding a New Orchestration Event

1. Add the type to `OrchestratorEventType` in `src/types/index.ts`
2. Add a config entry in `OrchestratorTimeline.tsx → TYPE_CONFIG`
3. Emit via `this.pushEvent(...)` in `orchestratorRuntime.ts`

---

## Adding Mock Data

Demo data lives in:
- `src/data/mockOrchestration.ts` — sessions, dependencies, load, reviews, timeline
- `src/data/mockPlanning.ts` — planner session, plan, subtasks, reasoning, blockers

The orchestrator runtime imports these at startup. Add to the arrays and the UI will pick up the changes on next boot.

---

## Naming Conventions

| Thing | Convention |
|---|---|
| Components | `PascalCase.tsx` |
| Hooks | `useXxx.ts` |
| Runtime singletons | `xxxRuntime.ts`, `xxxEngine.ts` |
| Types | `PascalCase` for interfaces, `camelCase` for type aliases |
| Mock data exports | `mockXxx` prefix |
| Event type strings | `SCREAMING_SNAKE_CASE` in runtimeTypes, `snake_case` in OrchestratorEventType |

---

## Coding Expectations

- TypeScript strict mode is on. All types must be explicit.
- No `any`. If you need escape hatches, use `unknown` with a type guard.
- Components under `src/components/orchestration/` consume `useOrchestrator()`.
- Components under `src/components/runtime/` consume `useRuntime()`.
- Keep components under ~200 lines. Extract sub-components or hooks if needed.
- No comments explaining what code does. Comments only for non-obvious constraints.

---

## Design System

The UI uses a dark glassmorphism design system. Key classes:

```css
glass           /* bg-white/[0.03] backdrop-blur-xl */
glass-strong    /* bg-white/[0.06] backdrop-blur-xl */
scrollbar-thin  /* custom thin scrollbar */
grid-overlay    /* subtle grid background texture */
```

Custom colour scale: `crimson-*` (brand red), plus standard Tailwind for accents.

**Motion:** always use `framer-motion`. Keep durations short (0.15–0.3s). Use `AnimatePresence` for mount/unmount. The runtime should feel calm, not animated for its own sake.

---

## Pull Request Checklist

Before submitting a PR:

- [ ] `npm run build` passes with no TypeScript errors
- [ ] `npm run lint` passes
- [ ] New components follow existing patterns (glass cards, monospace text, motion)
- [ ] New types are added to `src/types/index.ts`
- [ ] Mock data is in `src/data/`, not hardcoded in components
- [ ] No `console.log` left in production code
- [ ] PR description clearly explains what changed and why

---

## What Not to Do

- Do not add a global state manager (Redux, Zustand, Jotai). The observer pattern is intentional.
- Do not add real backend calls, databases, or cloud services.
- Do not add autonomous agent loops that run without human visibility.
- Do not break the controlled autonomy model — agents must not execute without supervision.
- Do not add motion that is distracting. The runtime should feel calm, not gamified.
