import { useEffect, useState } from 'react'
import { getEnvironment } from '../runtime/desktop/desktopBridge'
import { getLocalStore, type StoreInitResult, type StoreStatus } from '../runtime/store'

export interface PersistenceState {
  ready: boolean
  isDesktop: boolean
  init: StoreInitResult | null
  status: StoreStatus | null
  error: string | null
}

export function usePersistence(): PersistenceState {
  const isDesktop = getEnvironment() === 'tauri'
  const [ready, setReady] = useState(!isDesktop)
  const [init, setInit] = useState<StoreInitResult | null>(null)
  const [status, setStatus] = useState<StoreStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isDesktop) return

    let cancelled = false

    async function boot() {
      try {
        const store = getLocalStore()
        const initResult = await store.init()
        if (cancelled) return

        if (initResult.isEmpty) {
          await store.appendEvent({
            type: 'system_event',
            message: 'AgentOS store initialized',
            severity: 'info',
          })
        }

        const storeStatus = await store.getStatus()
        if (cancelled) return

        setInit(initResult)
        setStatus(storeStatus)
        setReady(true)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
        setReady(true)
      }
    }

    boot()
    return () => { cancelled = true }
  }, [isDesktop])

  return { ready, isDesktop, init, status, error }
}
