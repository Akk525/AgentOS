## What this PR does

<!-- One or two sentences. Be specific about the change. -->

## Why

<!-- Motivation or issue reference. -->

## Changes

<!-- List the files and what changed in each. Keep it scannable. -->

- `src/...` —
- `src/...` —

## Runtime layer(s) affected

<!-- Check all that apply -->

- [ ] UI components only
- [ ] OrchestratorRuntime / orchestration state
- [ ] RuntimeEngine / runtime state
- [ ] Types (`src/types/index.ts`)
- [ ] Mock data
- [ ] Documentation

## Checklist

- [ ] `npm run build` passes (no TypeScript errors)
- [ ] `npm run lint` passes
- [ ] New types added to `src/types/index.ts`
- [ ] Mock data in `src/data/`, not hardcoded in components
- [ ] Follows existing design patterns (glass cards, framer-motion, monospace text)
- [ ] No `console.log` in production paths
- [ ] No arbitrary agent execution authority introduced
- [ ] PR description clearly explains the change
