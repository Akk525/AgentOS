# Security Policy

## Project Status

As of v2.0, AgentOS can run as either a **browser-based prototype** or a **Tauri desktop application**.

**Browser mode** (default): no real shell commands, no filesystem writes, no real LLM calls. All session behaviour is simulated.

**Desktop mode (Tauri)** — cumulative capabilities as of v2.1:

| Capability | v2.0 | v2.1 |
|---|---|---|
| Native folder picker | ✓ | ✓ |
| Git repo detection (read `.git/HEAD`) | ✓ | ✓ |
| Platform detection | ✓ | ✓ |
| Git worktree creation | — | ✓ (writes to `<repo>/.agentos/worktrees/` only) |
| Allowlisted command execution | — | ✓ (explicit allowlist; see below) |
| Git diff reading | — | ✓ (read-only, any worktree) |

The v2.1 **command allowlist** (enforced in Rust):
- `ls`, `pwd`
- `git status`, `git diff`, `git log`
- `npm test`, `npm run test`, `pnpm test`, `yarn test`

Commands containing `;`, `&&`, `||`, backticks, `$()`, `rm`, `sudo`, `chmod`, `chown`, `git reset`, `git clean`, `git push`, `curl`, `wget`, or `eval` are always blocked at the Rust layer.

---

## Reporting a Vulnerability

If you discover a security vulnerability, please do **not** open a public GitHub issue.

Instead:
1. Open a GitHub issue titled `[SECURITY] <brief description>` with the body redacted, or
2. Contact the maintainers directly via the email listed in the repository profile.

We will acknowledge receipt within 72 hours and provide an estimated timeline for a fix.

---

## Scope

### In scope

- Vulnerabilities in the runtime simulation that could allow unintended code execution
- XSS or injection risks in the React UI
- Issues with provider credential handling (when real providers are integrated)
- Privilege escalation in the permission model
- Plugin sandbox escapes (once the plugin system is implemented)

### Out of scope

- Bugs in simulated data that do not have real-world security impact
- Issues in third-party dependencies (report those upstream)
- Theoretical vulnerabilities with no realistic attack path

---

## Local Execution Warning

In v2.1, AgentOS can run allowlisted commands in the active worktree. When PTY execution and real agent execution are implemented (v2.2+), this scope will expand. At that point:

- **Never grant an agent more permissions than necessary.** The permission escalation model exists for this reason — always review escalation requests.
- **Do not run AgentOS with elevated privileges** (sudo, root, or admin) unless you have explicitly audited the agent's planned actions.
- **Treat agent-generated commands as untrusted input** until reviewed. The runtime is designed to require human approval before executing destructive or irreversible actions.

---

## Provider Credential Handling

When connecting to real providers (Anthropic, OpenAI, Ollama):

- API keys should be stored in `.env` files, never committed to version control.
- `.env` is listed in `.gitignore`. Do not remove this.
- Do not log API keys. The runtime should never print credentials to the console or timeline feed.
- Rotate keys if you believe they have been exposed.

---

## Controlled Autonomy Principle

AgentOS is designed around the principle that **agents should not have arbitrary execution authority**. The permission escalation system, human override controls, and blocker/review flows all exist to enforce this. If you find a path that bypasses these controls — even in the simulation — please report it.

---

## Supported Versions

| Version | Supported |
|---|---|
| v2.x (current) | Yes |
| v1.x | Security fixes only |
| v0.x | No — upgrade to v2.x |
