# Media Assets

This directory contains screenshots, GIFs, and demo recordings for the AgentOS README and documentation.

## Planned Screenshots

| File | Description | Status |
|---|---|---|
| `orchestration-graph.png` | RuntimeGraph — session dependency graph with provider bindings | Pending |
| `runtime-plan.png` | RuntimePlanView — delegation chain with planner session and subtasks | Pending |
| `session-launch.gif` | SpawnSessionModal — 5-step session creation wizard + animated launch | Pending |
| `reasoning-panel.png` | RuntimeReasoningPanel — orchestration decision log | Pending |
| `review-session.png` | ReviewSessionPanel — live comment feed during patch review | Pending |
| `onboarding.gif` | First-run onboarding — boot sequence + feature showcase | Pending |
| `session-cluster.png` | SessionCluster — live multi-session table | Pending |
| `roadmap.png` | RoadmapView — development timeline | Pending |

## Recording Guidelines

When capturing screenshots or recordings:

- Use the built-in demo runtime (starts automatically on `npm run dev`)
- Wait ~35 seconds after boot for the full review lifecycle to complete
- Capture at 1440×900 or 1920×1080 for consistency
- Use Safari or Chrome — avoid browser UI in recordings
- Keep GIFs under 5MB; compress with `gifsicle` or `ffmpeg`

## Adding Media to README

Reference assets with relative paths from the repo root:

```markdown
![Orchestration Graph](docs/media/orchestration-graph.png)
```
