import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { Dashboard } from '../dashboard/Dashboard'
import { TaskBoard } from '../tasks/TaskBoard'
import { AgentSession } from '../sessions/AgentSession'
import { AgentsView } from '../agents/AgentsView'
import { SkillsView } from '../skills/SkillsView'
import { ProvidersView } from '../providers/ProvidersView'
import { LogsView } from '../logs/LogsView'
import { SettingsView } from '../settings/SettingsView'
import { NewTaskModal } from '../tasks/NewTaskModal'
import { RuntimeStatusBar } from '../runtime/RuntimeStatusBar'
import { RuntimeProvider } from '../../context/RuntimeContext'
import { WorkspaceManager } from '../workspace/WorkspaceManager'
import { CommandPalette } from '../command/CommandPalette'
import { NotificationToast } from '../shared/NotificationToast'
import { RuntimeView } from '../runtime/RuntimeView'
import { PermissionEscalationModal } from '../runtime/PermissionEscalationModal'
import { WorkspaceMountModal } from '../workspace/WorkspaceMountModal'
import { SpawnSessionModal } from '../sessions/SpawnSessionModal'
import { OrchestrationView } from '../orchestration/OrchestrationView'
import { OrchestratorProvider } from '../../context/OrchestratorContext'
import { TaskGraphProvider } from '../../context/TaskGraphContext'
import { RoadmapView } from '../roadmap/RoadmapView'
import { OnboardingOverlay } from '../onboarding/OnboardingOverlay'
import { GoalEntryGate } from '../goal/GoalEntryGate'
import { ShortcutsOverlay } from '../shared/ShortcutsOverlay'
import { useFirstRun } from '../../hooks/useFirstRun'
import { WebFallbackBanner } from '../shared/WebFallbackBanner'
import type { View } from '../../App'
import type { Task } from '../../types'
import type { StoreInitResult, StoreStatus } from '../../runtime/store'

interface AppShellProps {
  activeView: View
  onViewChange: (view: View) => void
  isDesktop: boolean
  persistenceInit: StoreInitResult | null
  persistenceStatus: StoreStatus | null
}

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export function AppShell({
  activeView,
  onViewChange,
  isDesktop,
  persistenceInit,
  persistenceStatus,
}: AppShellProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [mountModalOpen, setMountModalOpen] = useState(false)
  const [spawnOpen, setSpawnOpen] = useState(false)
  const [spawnWorkspaceId, setSpawnWorkspaceId] = useState<string | undefined>()
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const { isFirstRun, completeOnboarding } = useFirstRun()

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    onViewChange('sessions')
  }

  const closePalette = useCallback(() => setPaletteOpen(false), [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(open => !open)
        return
      }
      if (e.key === '?' && !isInput) {
        e.preventDefault()
        setShortcutsOpen(open => !open)
        return
      }
      if (e.key === 'Escape') {
        setShortcutsOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function renderView() {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard onViewChange={onViewChange} onTaskClick={handleTaskClick} />
      case 'workspaces':
        return <WorkspaceManager
          onMountWorkspace={() => setMountModalOpen(true)}
          onSpawnSession={id => { setSpawnWorkspaceId(id); setSpawnOpen(true) }}
        />
      case 'runtime':
        return (
          <RuntimeView
            persistenceInit={persistenceInit}
            persistenceStatus={persistenceStatus}
          />
        )
      case 'orchestration':
        return <OrchestrationView />
      case 'roadmap':
        return <RoadmapView />
      case 'tasks':
        return <TaskBoard onTaskClick={handleTaskClick} />
      case 'sessions':
        return <AgentSession task={selectedTask} onBack={() => onViewChange('tasks')} />
      case 'agents':
        return <AgentsView />
      case 'skills':
        return <SkillsView />
      case 'providers':
        return <ProvidersView />
      case 'logs':
        return <LogsView />
      case 'settings':
        return <SettingsView />
      default:
        return <Dashboard onViewChange={onViewChange} onTaskClick={handleTaskClick} />
    }
  }

  return (
    <RuntimeProvider>
      <TaskGraphProvider>
      <OrchestratorProvider>
      <div className="flex h-full w-full overflow-hidden">
        {/* Background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-[#06060a]" />
          <div className="absolute inset-0 grid-overlay" />
          <div className="absolute -top-32 -left-32 w-[700px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(159,18,57,0.12) 0%, transparent 70%)' }} />
          <div className="absolute -bottom-40 right-0 w-[600px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(109,40,217,0.07) 0%, transparent 70%)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(15,23,42,0.4) 0%, transparent 75%)' }} />
        </div>

        {/* Layout */}
        <div className="relative flex w-full h-full z-10">
          <Sidebar activeView={activeView} onViewChange={onViewChange} />

          <div className="flex-1 flex flex-col min-w-0">
            {!isDesktop && <WebFallbackBanner />}
            <TopBar activeView={activeView} onNewTask={() => setNewTaskOpen(true)} />

            <main className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeView}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="h-full"
                >
                  {renderView()}
                </motion.div>
              </AnimatePresence>
            </main>

            <RuntimeStatusBar />
          </div>
        </div>

        {/* New Task Modal */}
        <AnimatePresence>
          {newTaskOpen && <NewTaskModal onClose={() => setNewTaskOpen(false)} />}
        </AnimatePresence>

        <CommandPalette
          open={paletteOpen}
          onClose={closePalette}
          onViewChange={onViewChange}
          onSpawnSession={() => { setSpawnOpen(true); setSpawnWorkspaceId(undefined) }}
        />
        <NotificationToast />
        <PermissionEscalationModal />
        <AnimatePresence>
          {mountModalOpen && <WorkspaceMountModal onClose={() => setMountModalOpen(false)} />}
        </AnimatePresence>
        <AnimatePresence>
          {spawnOpen && (
            <SpawnSessionModal
              onClose={() => setSpawnOpen(false)}
              initialWorkspace={spawnWorkspaceId}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {shortcutsOpen && <ShortcutsOverlay onClose={() => setShortcutsOpen(false)} />}
        </AnimatePresence>
        <AnimatePresence>
          {isFirstRun && <OnboardingOverlay onComplete={completeOnboarding} />}
        </AnimatePresence>
        <GoalEntryGate onViewChange={onViewChange} />
      </div>
      </OrchestratorProvider>
      </TaskGraphProvider>
    </RuntimeProvider>
  )
}
