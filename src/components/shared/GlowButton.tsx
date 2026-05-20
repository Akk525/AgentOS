import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

interface GlowButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  disabled?: boolean
  icon?: React.ReactNode
}

const variants = {
  primary: 'bg-crimson-600 hover:bg-crimson-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:shadow-[0_0_28px_rgba(244,63,94,0.5)] border border-crimson-500/50',
  secondary: 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 hover:border-white/20',
  ghost: 'bg-transparent hover:bg-white/5 text-slate-400 hover:text-slate-200',
  danger: 'bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800/50',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-sm gap-2',
}

export function GlowButton({
  children, onClick, variant = 'secondary', size = 'md', className, disabled, icon,
}: GlowButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center rounded-xl font-medium transition-all duration-150 cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-crimson-500/40',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </motion.button>
  )
}
