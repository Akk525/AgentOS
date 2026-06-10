import { useState } from 'react'
import { X, Monitor } from 'lucide-react'

export function WebFallbackBanner() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="flex items-center justify-between gap-3 border-b border-amber-500/15 bg-amber-500/5 px-4 py-2">
      <div className="flex items-center gap-2 text-[11px] font-mono text-amber-600/80">
        <Monitor size={11} className="flex-shrink-0" />
        <span>Web preview — run <code className="text-amber-500/90">npm run dev</code> for the full desktop app with persistence.</span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-600/50 hover:text-amber-500/80 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}
