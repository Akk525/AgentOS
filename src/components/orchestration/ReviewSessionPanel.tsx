import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, MessageSquare, CheckCircle2, XCircle,
  HelpCircle, FileCode, ThumbsUp, ThumbsDown, GitMerge,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useOrchestrator } from '../../context/OrchestratorContext'
import { formatRelativeTime } from '../../lib/utils'
import type { ReviewSession, ReviewComment, ReviewCommentType } from '../../types'

const COMMENT_CONFIG: Record<ReviewCommentType, {
  icon: React.ReactNode; color: string; bg: string; border: string
}> = {
  suggestion: { icon: <MessageSquare size={9} />, color: 'text-cyan-400',    bg: 'bg-cyan-500/6',    border: 'border-cyan-500/15'   },
  warning:    { icon: <AlertTriangle size={9} />, color: 'text-amber-400',   bg: 'bg-amber-500/8',   border: 'border-amber-500/20'  },
  approval:   { icon: <CheckCircle2 size={9} />, color: 'text-emerald-400',  bg: 'bg-emerald-500/6', border: 'border-emerald-500/15'},
  rejection:  { icon: <XCircle size={9} />,      color: 'text-crimson-400',  bg: 'bg-crimson-500/6', border: 'border-crimson-500/15'},
  question:   { icon: <HelpCircle size={9} />,   color: 'text-violet-400',   bg: 'bg-violet-500/6',  border: 'border-violet-500/15' },
}

const VERDICT_CONFIG = {
  approved:              { label: 'Approved',              color: 'text-emerald-400', icon: <ThumbsUp size={12} />  },
  approved_with_changes: { label: 'Approved with changes', color: 'text-amber-400',   icon: <GitMerge size={12} /> },
  rejected:              { label: 'Rejected',              color: 'text-crimson-400', icon: <ThumbsDown size={12} />},
}

function ReviewCommentCard({ comment, index }: { comment: ReviewComment; index: number }) {
  const cfg = COMMENT_CONFIG[comment.type]
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.15 }}
      className={cn('rounded-xl border px-3 py-2.5 space-y-1.5', cfg.bg, cfg.border)}
    >
      <div className="flex items-center gap-2">
        <span className={cfg.color}>{cfg.icon}</span>
        <span className={cn('text-[9px] font-mono uppercase tracking-wide', cfg.color)}>{comment.type}</span>
        {comment.file && (
          <>
            <span className="text-slate-800">·</span>
            <div className="flex items-center gap-1 text-[9px] font-mono text-slate-600">
              <FileCode size={8} />
              <span className="truncate max-w-[160px]">
                {comment.file.split('/').slice(-1)[0]}
                {comment.lineRange ? `:${comment.lineRange}` : ''}
              </span>
            </div>
          </>
        )}
        <span className="ml-auto text-[8px] font-mono text-slate-800">
          {formatRelativeTime(comment.timestamp)}
        </span>
      </div>
      <p className="text-[10px] font-mono text-slate-400 leading-relaxed">{comment.content}</p>
    </motion.div>
  )
}

function ReviewCard({ review }: { review: ReviewSession }) {
  const isActive = review.status === 'running'
  const verdict = review.verdict ? VERDICT_CONFIG[review.verdict] : null
  const warnCount = review.comments.filter(c => c.type === 'warning').length
  const suggCount = review.comments.filter(c => c.type === 'suggestion').length

  return (
    <div className="glass rounded-2xl border border-white/[0.07] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.05]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className={cn('w-2 h-2 rounded-full', isActive ? 'bg-violet-400' : verdict ? 'bg-emerald-400' : 'bg-slate-600')} />
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-violet-400"
                  animate={{ scale: [1, 2.5, 1], opacity: [0.8, 0, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </div>
            <span className="text-[12px] font-semibold text-slate-300">{review.reviewerName}</span>
            <span className="text-[9px] font-mono text-slate-700">reviewing patch</span>
          </div>
          {verdict && (
            <div className={cn('flex items-center gap-1.5 text-[10px] font-mono', verdict.color)}>
              {verdict.icon}
              {verdict.label}
            </div>
          )}
          {isActive && !verdict && (
            <motion.div
              className="flex items-center gap-1.5 text-[9px] font-mono text-violet-400"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span>●</span> analyzing
            </motion.div>
          )}
        </div>

        <div className="flex items-center gap-3 text-[9px] font-mono text-slate-700">
          {warnCount > 0 && (
            <span className="text-amber-600">{warnCount} warning{warnCount > 1 ? 's' : ''}</span>
          )}
          {suggCount > 0 && (
            <span className="text-cyan-700">{suggCount} suggestion{suggCount > 1 ? 's' : ''}</span>
          )}
          <span className="ml-auto">assigned {formatRelativeTime(review.assignedAt)}</span>
        </div>
      </div>

      {/* Comments */}
      <div className="p-4 space-y-2">
        {review.comments.length === 0 ? (
          <motion.div
            className="flex items-center gap-2 text-[10px] font-mono text-slate-700"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Reviewing codebase — findings will appear here
          </motion.div>
        ) : (
          <AnimatePresence>
            {review.comments.map((comment, i) => (
              <ReviewCommentCard key={comment.id} comment={comment} index={i} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

export function ReviewSessionPanel() {
  const { reviewSessions, activeSessions } = useOrchestrator()

  const pendingReview = activeSessions.filter(s => s.status === 'awaiting_review')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Awaiting assignment */}
      {pendingReview.length > 0 && (
        <div className="px-5 py-3 border-b border-white/[0.04] flex-shrink-0">
          <div className="text-[9px] font-mono text-slate-700 uppercase tracking-widest mb-2">Awaiting reviewer</div>
          {pendingReview.map(s => (
            <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/6 border border-violet-500/15">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              <span className="text-[10px] font-mono text-slate-400">{s.taskTitle}</span>
              <span className="text-[9px] font-mono text-slate-700 ml-auto">{s.workspaceName}</span>
            </div>
          ))}
        </div>
      )}

      {/* Active reviews */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
        {reviewSessions.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-[11px] font-mono text-slate-700">
            No active review sessions
          </div>
        ) : (
          reviewSessions.map(review => (
            <ReviewCard key={review.id} review={review} />
          ))
        )}
      </div>
    </div>
  )
}
