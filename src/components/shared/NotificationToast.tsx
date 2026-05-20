import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react'
import { useRuntime } from '../../context/RuntimeContext'
import type { RuntimeNotification, NotificationType } from '../../types'

const toastConfig: Record<NotificationType, {
  icon: React.ReactNode
  border: string
  bg: string
  titleColor: string
}> = {
  success: {
    icon: <CheckCircle2 size={13} />,
    border: 'border-emerald-500/20',
    bg: 'rgba(16,185,129,0.05)',
    titleColor: 'text-emerald-300',
  },
  info: {
    icon: <Info size={13} />,
    border: 'border-cyan-500/20',
    bg: 'rgba(34,211,238,0.04)',
    titleColor: 'text-cyan-300',
  },
  warning: {
    icon: <AlertTriangle size={13} />,
    border: 'border-amber-500/20',
    bg: 'rgba(251,191,36,0.05)',
    titleColor: 'text-amber-300',
  },
  error: {
    icon: <XCircle size={13} />,
    border: 'border-crimson-500/20',
    bg: 'rgba(244,63,94,0.05)',
    titleColor: 'text-crimson-300',
  },
}

interface ToastItemProps {
  notification: RuntimeNotification
  onDismiss: (id: string) => void
}

function ToastItem({ notification, onDismiss }: ToastItemProps) {
  const cfg = toastConfig[notification.type]

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(notification.id), 4200)
    return () => clearTimeout(timer)
  }, [notification.id, onDismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 32, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 32, scale: 0.94 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border w-72 shadow-[0_8px_32px_rgba(0,0,0,0.4)]`}
      style={{ background: cfg.bg, backdropFilter: 'blur(20px)', borderColor: cfg.border.replace('border-', '') }}
    >
      <span className={`flex-shrink-0 mt-0.5 ${cfg.titleColor}`}>{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-[12px] font-medium leading-snug ${cfg.titleColor}`}>{notification.title}</p>
        {notification.message && (
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{notification.message}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(notification.id)}
        className="flex-shrink-0 text-slate-700 hover:text-slate-400 transition-colors mt-0.5"
      >
        <X size={11} />
      </button>
    </motion.div>
  )
}

export function NotificationToast() {
  const { notifications, dismissNotification } = useRuntime()
  const visible = notifications.slice(-4)

  return (
    <div className="fixed bottom-12 right-4 z-50 flex flex-col-reverse gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {visible.map(n => (
          <div key={n.id} className="pointer-events-auto">
            <ToastItem notification={n} onDismiss={dismissNotification} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
