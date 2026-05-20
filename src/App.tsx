import { useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { Landing } from './pages/Landing'

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

  if (!hasEntered) {
    return (
      <Landing onEnter={() => {
        localStorage.setItem('agentos.entered', '1')
        setHasEntered(true)
      }} />
    )
  }

  return (
    <AppShell activeView={activeView} onViewChange={setActiveView} />
  )
}

export default App
