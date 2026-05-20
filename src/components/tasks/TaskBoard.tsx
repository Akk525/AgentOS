import { useState } from 'react'
import { Filter, SortAsc } from 'lucide-react'
import { TaskColumn } from './TaskColumn'
import { GlowButton } from '../shared/GlowButton'
import { mockTasks } from '../../data/mockTasks'
import type { Task, TaskStatus } from '../../types'

const columns: TaskStatus[] = ['backlog', 'claimed', 'running', 'review', 'needs_changes', 'done', 'failed']

interface TaskBoardProps {
  onTaskClick: (task: Task) => void
}

export function TaskBoard({ onTaskClick }: TaskBoardProps) {
  const [tasks] = useState(mockTasks)

  const tasksByStatus = (status: TaskStatus) => tasks.filter(t => t.status === status)

  return (
    <div className="flex flex-col h-full">
      {/* Board toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">
            <span className="text-white font-semibold">{tasks.length}</span> tasks
          </span>
          <div className="h-4 w-px bg-white/[0.08]" />
          <div className="flex items-center gap-2">
            {(['running', 'review', 'needs_changes'] as TaskStatus[]).map(s => {
              const count = tasksByStatus(s).length
              if (count === 0) return null
              return (
                <span key={s} className="text-[11px] font-mono text-slate-500">
                  {count} {s.replace('_', ' ')}
                </span>
              )
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <GlowButton variant="ghost" size="sm" icon={<Filter size={13} />}>
            Filter
          </GlowButton>
          <GlowButton variant="ghost" size="sm" icon={<SortAsc size={13} />}>
            Sort
          </GlowButton>
        </div>
      </div>

      {/* Columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 h-full px-5 py-4 min-w-max">
          {columns.map(status => (
            <TaskColumn
              key={status}
              status={status}
              tasks={tasksByStatus(status)}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
