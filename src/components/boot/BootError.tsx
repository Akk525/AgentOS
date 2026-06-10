interface BootErrorProps {
  error: string
}

export function BootError({ error }: BootErrorProps) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a0f] p-6">
      <div className="max-w-md rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
        <p className="text-sm font-semibold text-red-400">Failed to initialize local store</p>
        <p className="mt-2 text-xs font-mono text-slate-500 break-all">{error}</p>
        <p className="mt-4 text-xs text-slate-600">
          AgentOS requires a working SQLite store in desktop mode. Check app data permissions and restart.
        </p>
      </div>
    </div>
  )
}
