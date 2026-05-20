import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, ShieldAlert, ShieldX, ChevronDown, Shield } from 'lucide-react'
import { cn } from '../../lib/utils'
import { sessionPermissions } from '../../data/mockPermissions'
import type { Permission, PermissionStatus, PermissionRisk } from '../../types'

const statusIcon: Record<PermissionStatus, React.ReactNode> = {
  allowed:              <ShieldCheck size={11} />,
  require_confirmation: <ShieldAlert size={11} />,
  denied:               <ShieldX size={11} />,
}

const statusColor: Record<PermissionStatus, string> = {
  allowed:              'text-emerald-400',
  require_confirmation: 'text-amber-400',
  denied:               'text-crimson-400/80',
}

const riskDot: Record<PermissionRisk, string> = {
  low:      'bg-emerald-500/60',
  medium:   'bg-amber-500/70',
  high:     'bg-amber-400',
  critical: 'bg-crimson-500',
}

function PermissionRow({ perm }: { perm: Permission }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-2 py-1 px-1.5 rounded-lg hover:bg-white/[0.03] transition-colors">
        <span className={cn('flex-shrink-0', statusColor[perm.status])}>
          {statusIcon[perm.status]}
        </span>
        <span className="text-[10px] font-mono text-slate-500 flex-1 truncate">{perm.label}</span>
        <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', riskDot[perm.riskLevel])} />
      </div>

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 z-50 mt-0.5 p-2.5 rounded-lg border border-white/[0.08] text-[10px] text-slate-500 leading-relaxed pointer-events-none"
            style={{ background: 'rgba(8,8,16,0.95)', backdropFilter: 'blur(16px)', top: '100%' }}
          >
            {perm.description}
            <span className={cn('ml-1.5 font-mono', statusColor[perm.status])}>
              · {perm.status.replace('_', ' ')}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function PermissionsPanel() {
  const [expanded, setExpanded] = useState(false)

  const allowed = sessionPermissions.filter(p => p.status === 'allowed').length
  const warnings = sessionPermissions.filter(p => p.status === 'require_confirmation').length
  const denied = sessionPermissions.filter(p => p.status === 'denied').length

  return (
    <div className="border-t border-white/[0.04]">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <Shield size={10} className="text-slate-600" />
          <span className="text-[9px] text-slate-700 font-mono uppercase tracking-widest">Permissions</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[9px] font-mono">
            <span className="text-emerald-600">{allowed}✓</span>
            {warnings > 0 && <span className="text-amber-600">{warnings}⚠</span>}
            {denied > 0 && <span className="text-crimson-600">{denied}✕</span>}
          </div>
          <ChevronDown
            size={10}
            className={cn('text-slate-700 transition-transform', expanded && 'rotate-180')}
          />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-4 space-y-0.5">
              {sessionPermissions.map(perm => (
                <PermissionRow key={perm.id} perm={perm} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
