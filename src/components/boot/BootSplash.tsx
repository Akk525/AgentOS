export function BootSplash() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a0f]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-crimson-500/30 border-t-crimson-500" />
        <div className="text-center">
          <p className="text-sm font-semibold text-white">AgentOS</p>
          <p className="mt-1 text-xs font-mono text-slate-500">Initializing local store…</p>
        </div>
      </div>
    </div>
  )
}
