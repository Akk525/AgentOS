import { cn } from '../../lib/utils'

interface GlassPanelProps {
  children: React.ReactNode
  className?: string
  strong?: boolean
  onClick?: () => void
}

export function GlassPanel({ children, className, strong, onClick }: GlassPanelProps) {
  return (
    <div
      className={cn(
        strong ? 'glass-strong' : 'glass',
        'rounded-2xl',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
