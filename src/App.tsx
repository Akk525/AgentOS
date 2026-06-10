import { useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { BootError } from './components/boot/BootError'
import { BootSplash } from './components/boot/BootSplash'
import { Landing } from './pages/Landing'
import { usePersistence } from './hooks/usePersistence'

export type View =
  | 'dashboard'
  | 'tasks'
  | 'sessions'
  | 'agents'
  | 'skills'
  | 'providers'
  | 'logs'
  | 'settings'
  | 'workspaces'
  | 'runtime'
  | 'orchestration'
  | 'roadmap'

function App() {
  const [activeView, setActiveView] = useState<View>('dashboard')
  const [hasEntered, setHasEntered] = useState(
    () => !!localStorage.getItem('agentos.entered')
  )
  const { ready, isDesktop, error, init, status } = usePersistence()

  if (!hasEntered) {
    return (
      <Landing onEnter={() => {
        localStorage.setItem('agentos.entered', '1')
        setHasEntered(true)
      }} />
    )
  }

  if (!ready) return <BootSplash />
  if (error && isDesktop) return <BootError error={error} />

  return (
    <AppShell
      activeView={activeView}
      onViewChange={setActiveView}
      persistenceInit={init}
      persistenceStatus={status}
      isDesktop={isDesktop}
    />
  )
}

export default App
