import { motion, AnimatePresence } from 'framer-motion'
import { ShieldX, AlertTriangle, Terminal, X, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useRuntime } from '../../context/RuntimeContext'

const riskConfig = {
  high: {
    border: 'border-amber-500/30',
    bg: 'rgba(251,191,36,0.04)',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    glow: 'shadow-[0_0_40px_rgba(251,191,36,0.08)]',
    icon: <AlertTriangle size={16} className="text-amber-400" />,
  },
  critical: {
    border: 'border-crimson-500/40',
    bg: 'rgba(244,63,94,0.05)',
    badge: 'bg-crimson-500/15 text-crimson-400 border-crimson-500/30',
    glow: 'shadow-[0_0_40px_rgba(244,63,94,0.12)]',
    icon: <ShieldX size={16} className="text-crimson-400" />,
  },
}

export function PermissionEscalationModal() {
  const { pendingEscalation, approveEscalation, denyEscalation } = useRuntime()

  return (
    <AnimatePresence>
      {pendingEscalation && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={cn(
              'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
              'w-[520px] rounded-2xl border overflow-hidden',
              riskConfig[pendingEscalation.riskLevel].border,
              riskConfig[pendingEscalation.riskLevel].glow,
            )}
            style={{
              background: riskConfig[pendingEscalation.riskLevel].bg,
              backdropFilter: 'blur(24px)',
            }}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {riskConfig[pendingEscalation.riskLevel].icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[13px] font-semibold text-slate-100">
                    Permission escalation required
                  </span>
                  <span className={cn(
                    'text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border',
                    riskConfig[pendingEscalation.riskLevel].badge,
                  )}>
                    {pendingEscalation.riskLevel}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-600">
                  {pendingEscalation.agentName} · {pendingEscalation.workspaceName}
                </div>
              </div>
              <button
                onClick={() => denyEscalation(pendingEscalation.id)}
                className="flex-shrink-0 text-slate-700 hover:text-slate-400 transition-colors"
              >
                <X size={13} />
              </button>
            </div>

            {/* Command preview */}
            <div className="px-5 py-4">
              <div className="text-[9px] font-mono text-slate-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Terminal size={9} />
                Requested command
              </div>
              <div className="px-3 py-2.5 rounded-xl bg-black/40 border border-white/[0.06] font-mono text-[12px] text-slate-300">
                <span className="text-slate-600 select-none">$ </span>
                {pendingEscalation.command}
              </div>
            </div>

            {/* Risk explanation */}
            <div className="px-5 pb-4">
              <div className="text-[9px] font-mono text-slate-700 uppercase tracking-widest mb-2">
                Why this is flagged
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {pendingEscalation.riskExplanation}
              </p>
            </div>

            {/* Affected permission */}
            <div className="px-5 pb-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono border border-white/[0.07] bg-white/[0.03] text-slate-600">
                <ShieldX size={9} className="text-crimson-500" />
                <span>Requires override of:</span>
                <span className="text-slate-400">{pendingEscalation.permissionId}</span>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-white/[0.06]" />

            {/* Actions */}
            <div className="px-5 py-4 flex items-center gap-3">
              <button
                onClick={() => approveEscalation(pendingEscalation.id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-mono font-medium bg-crimson-500/15 text-crimson-300 border border-crimson-500/30 hover:bg-crimson-500/25 hover:border-crimson-500/50 transition-all"
              >
                <CheckCircle size={11} />
                Approve & continue
              </button>
              <button
                onClick={() => denyEscalation(pendingEscalation.id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-mono font-medium bg-white/[0.04] text-slate-400 border border-white/[0.08] hover:bg-white/[0.07] hover:text-slate-200 transition-all"
              >
                <XCircle size={11} />
                Deny
              </button>
            </div>

            {/* Warning footer */}
            <div className="px-5 pb-3 text-[10px] font-mono text-slate-700 text-center">
              Approval grants one-time elevated access for this operation only.
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
