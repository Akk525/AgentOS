import type {
  ActiveSession, RuntimeLoad, ReviewSession, ReviewComment,
  OrchestratorEvent, RuntimeQueueEntry, SessionDependency,
  RuntimePlan, RuntimeReasoning, RuntimeBlocker,
} from '../types'
import {
  mockActiveSessions, initialRuntimeLoad, mockReviewSessions,
  mockRuntimeQueue, mockDependencies, mockOrchestratorTimeline,
  mockReviewComments,
} from '../data/mockOrchestration'
import {
  mockPlannerSession, mockRuntimePlans, mockReasoning, mockBlockers,
} from '../data/mockPlanning'

export interface OrchestratorState {
  activeSessions: ActiveSession[]
  dependencies: SessionDependency[]
  runtimeQueue: RuntimeQueueEntry[]
  runtimeLoad: RuntimeLoad
  reviewSessions: ReviewSession[]
  timeline: OrchestratorEvent[]
  runtimePlans: RuntimePlan[]
  reasoning: RuntimeReasoning[]
  blockers: RuntimeBlocker[]
}

type OrchestratorListener = (state: OrchestratorState) => void

const ts = () => new Date().toISOString()
const uid = () => `oe-live-${Date.now()}`

class OrchestratorRuntime {
  private state: OrchestratorState = {
    activeSessions: [...mockActiveSessions, mockPlannerSession],
    dependencies:   [...mockDependencies],
    runtimeQueue:   [...mockRuntimeQueue],
    runtimeLoad:    { ...initialRuntimeLoad },
    reviewSessions: [...mockReviewSessions],
    timeline:       [...mockOrchestratorTimeline],
    runtimePlans:   [...mockRuntimePlans],
    reasoning:      [...mockReasoning],
    blockers:       [...mockBlockers],
  }

  private listeners = new Set<OrchestratorListener>()

  constructor() {
    setTimeout(() => this.boot(), 2000)
  }

  getState(): OrchestratorState {
    return this.state
  }

  subscribe(fn: OrchestratorListener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private patch(updates: Partial<OrchestratorState>): void {
    this.state = { ...this.state, ...updates }
    this.listeners.forEach(fn => fn(this.state))
  }

  private pushEvent(ev: Omit<OrchestratorEvent, 'id' | 'timestamp'>): void {
    const entry: OrchestratorEvent = { id: uid(), timestamp: ts(), ...ev }
    this.patch({ timeline: [entry, ...this.state.timeline].slice(0, 60) })
  }

  private updateSession(id: string, updates: Partial<ActiveSession>): void {
    this.patch({
      activeSessions: this.state.activeSessions.map(s =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })
  }

  private updateLoad(overrides: Partial<RuntimeLoad>): void {
    this.patch({ runtimeLoad: { ...this.state.runtimeLoad, ...overrides } })
  }

  // ── Boot sequence ───────────────────────────────────────────────────────

  private boot(): void {
    // Load ticker — every 4s
    setInterval(() => this.tickLoad(), 4000)

    // Token usage ticker — every 6s (running sessions accumulate tokens)
    setInterval(() => this.tickTokens(), 6000)

    // Session handoff: after 10s → sess-001 transitions to awaiting_review
    setTimeout(() => this.initiateReviewHandoff(), 10000)

    // Reviewer comment drip
    setTimeout(() => this.dripReviewComment(mockReviewComments[2]), 18000)

    // Reviewer completes after 35s
    setTimeout(() => this.completeReview(), 35000)

    // Sess-003 patch update after 20s
    setTimeout(() => this.updateSession('sess-003', {
      patchVersion: 2, phase: 'tests_rerunning', tokensUsed: 52400,
    }), 20000)
    setTimeout(() => {
      this.updateSession('sess-003', { phase: 'ready_for_review', testsPassed: 24, status: 'awaiting_review' })
      this.pushEvent({ type: 'tests_passed', sessionId: 'sess-003', agentName: 'Atlas', workspaceName: 'boilerbyte', message: 'Atlas: 24 payment integration tests passing', severity: 'success' })
    }, 28000)
  }

  // ── Load simulation ─────────────────────────────────────────────────────

  private tickLoad(): void {
    const cpu = 52 + Math.random() * 28
    const tokens = 2200 + Math.random() * 1200
    const mem = 4000 + Math.random() * 600
    const anthropicUsed = 4 - (this.state.activeSessions.filter(s => s.status === 'blocked').length)
    this.updateLoad({
      cpuPercent: Math.round(cpu),
      tokenThroughputPerSec: Math.round(tokens),
      memoryMb: Math.round(mem),
      providerCapacity: {
        ...this.state.runtimeLoad.providerCapacity,
        anthropic: { used: anthropicUsed, max: 5 },
      },
    })
  }

  private tickTokens(): void {
    const runningIds = this.state.activeSessions
      .filter(s => s.status === 'running')
      .map(s => s.id)
    const updates = this.state.activeSessions.map(s =>
      runningIds.includes(s.id)
        ? { ...s, tokensUsed: s.tokensUsed + Math.floor(1800 + Math.random() * 2400), costUsd: +(s.costUsd + 0.012 + Math.random() * 0.018).toFixed(3) }
        : s
    )
    this.patch({ activeSessions: updates })
  }

  // ── Review handoff ──────────────────────────────────────────────────────

  private initiateReviewHandoff(): void {
    this.updateSession('sess-001', { status: 'awaiting_review', phase: 'ready_for_review' })
    this.pushEvent({
      type: 'review_assigned', sessionId: 'sess-001', agentName: 'Cipher',
      workspaceName: 'boilerbyte',
      message: 'Auth patch v2 ready — Echo assigned for security review',
      severity: 'info',
    })

    setTimeout(() => {
      this.updateSession('sess-002', { status: 'reviewing', phase: 'autonomous_running' })
      // Add reviewer to reviewSessions
      this.patch({
        reviewSessions: this.state.reviewSessions.map(r =>
          r.id === 'rev-001' ? { ...r, status: 'running' } : r
        ),
      })
      this.pushEvent({
        type: 'review_comment', sessionId: 'sess-002', agentName: 'Echo',
        workspaceName: 'boilerbyte',
        message: 'Echo started reviewing — scanning for security issues',
        severity: 'info',
      })
    }, 2500)
  }

  private dripReviewComment(comment: ReviewComment): void {
    const updated = this.state.reviewSessions.map(r =>
      r.id === 'rev-001'
        ? { ...r, comments: [...r.comments, { ...comment, timestamp: ts() }] }
        : r
    )
    this.patch({ reviewSessions: updated })
    this.pushEvent({
      type: 'review_comment', sessionId: 'sess-002', agentName: 'Echo',
      workspaceName: 'boilerbyte',
      message: `Echo: ${comment.content.slice(0, 70)}…`,
      severity: 'warning',
    })
  }

  private completeReview(): void {
    this.patch({
      reviewSessions: this.state.reviewSessions.map(r =>
        r.id === 'rev-001'
          ? { ...r, status: 'completed', verdict: 'approved_with_changes', completedAt: ts() }
          : r
      ),
    })
    this.updateSession('sess-002', { status: 'completed', phase: 'ready_for_review' })
    this.updateSession('sess-001', { status: 'completed' })
    this.pushEvent({
      type: 'review_approved', sessionId: 'sess-002', agentName: 'Echo',
      workspaceName: 'boilerbyte',
      message: 'Echo: Approved with changes — 3 findings, 2 blocking',
      severity: 'success',
    })

    // Unblock sess-004 after auth merges
    setTimeout(() => {
      this.updateSession('sess-004', { status: 'initializing', blockReason: undefined, phase: 'autonomous_running' })
      this.resolveBlocker('blk-001')
      this.pushReasoning({
        decisionType: 'blocker_resolved',
        affectedAgentName: 'Refactor',
        affectedSessionId: 'sess-004',
        planId: 'plan-001',
        explanation: 'Middleware cleanup unblocked — token fix merged. Refactor session resuming on auth/types.ts migration.',
        severity: 'info',
      })
      this.pushEvent({
        type: 'blocker_resolved', sessionId: 'sess-004', agentName: 'Rex',
        workspaceName: 'clauseguard',
        message: 'Refactor session unblocked — auth merge resolved type conflict',
        severity: 'success',
      })
    }, 3000)
  }

  // ── Plan + reasoning helpers ────────────────────────────────────────────

  private pushReasoning(entry: Omit<RuntimeReasoning, 'id' | 'timestamp'>): void {
    const record: RuntimeReasoning = {
      id: `rr-live-${Date.now()}`,
      timestamp: ts(),
      ...entry,
    }
    this.patch({ reasoning: [record, ...this.state.reasoning].slice(0, 40) })
  }

  private resolveBlocker(id: string): void {
    this.patch({
      blockers: this.state.blockers.map(b =>
        b.id === id ? { ...b, resolved: true } : b
      ),
    })
  }

  escalateBlocker(id: string): void {
    this.patch({
      blockers: this.state.blockers.map(b =>
        b.id === id ? { ...b, escalatedToHuman: true } : b
      ),
    })
    const blocker = this.state.blockers.find(b => b.id === id)
    if (blocker) {
      this.pushReasoning({
        decisionType: 'escalation',
        affectedSessionId: blocker.sessionId,
        explanation: `Blocker escalated to human — automatic resolution not possible. Awaiting manual intervention.`,
        severity: 'critical',
      })
      this.pushEvent({
        type: 'escalated',
        message: 'Blocker escalated to human supervisor',
        severity: 'warning',
      })
    }
  }

  overrideAssignment(sessionId: string, field: string, value: string): void {
    this.pushReasoning({
      decisionType: 'human_override',
      affectedSessionId: sessionId,
      explanation: `Human overrode ${field} → ${value} for session ${sessionId}.`,
      severity: 'info',
    })
    this.pushEvent({
      type: 'session_started',
      sessionId,
      message: `Human override: ${field} changed to ${value}`,
      severity: 'info',
    })
  }
}

export const orchestratorRuntime = new OrchestratorRuntime()
