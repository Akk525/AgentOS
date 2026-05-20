# Social Assets

Launch assets for AgentOS v1.3.

## Files

| File | Format | Dimensions | Use |
|---|---|---|---|
| `og-image.svg` (in `/public/`) | SVG | 1200×630 | OG image for GitHub, Twitter, HN |
| `banner-wide.png` | PNG | 1500×500 | Twitter/X header banner |
| `avatar-square.png` | PNG | 400×400 | Profile avatar |
| `demo-terminal.gif` | GIF | 1200×800 | Launch tweet / Reddit post |
| `graph-screenshot.png` | PNG | 1440×900 | HN / blog post featured image |

## Status

- [x] OG image (SVG placeholder in `/public/og-image.svg`)
- [ ] PNG exports (pending screenshot capture)
- [ ] Demo GIF
- [ ] Twitter banner

## Recording the Demo GIF

```bash
npm run dev
# Wait ~35s for the full review lifecycle to complete
# Navigate to Orchestration → Graph
# Record a 15-20s clip showing live session updates
# Convert to GIF: ffmpeg -i recording.mp4 -vf "fps=12,scale=1200:-1" demo.gif
# Compress: gifsicle --optimize=3 demo.gif -o demo-opt.gif
```

## Launch Messaging

**HN title:**
> AgentOS – Local-first operating environment for steerable coding agents (open source)

**Twitter thread hook:**
> We're building AgentOS — a local-first runtime for supervised coding agents.
> 
> Not a chatbot wrapper. Not autonomous AGI. An operational layer that keeps you in control.
>
> 6 session roles. Runtime planning. Interpretable orchestration. Human override at every step.

**Reddit r/programming hook:**
> Show HN: AgentOS — open source runtime environment for steerable coding agents
> 
> The goal: you should be able to supervise multi-agent coding sessions the way an engineering lead supervises a team — with full visibility, steerability, and the ability to override any decision.
