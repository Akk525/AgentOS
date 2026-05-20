import { GlassPanel } from '../shared/GlassPanel'
import { GlowButton } from '../shared/GlowButton'
import { Shield, GitBranch, Bell, Palette, Key } from 'lucide-react'

interface SettingSection {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  settings: Setting[]
}

interface Setting {
  label: string
  description?: string
  type: 'toggle' | 'text' | 'select'
  value: string | boolean
  options?: string[]
}

const sections: SettingSection[] = [
  {
    id: 'runtime',
    icon: <Shield size={14} />,
    title: 'Runtime & Permissions',
    description: 'Control what agents can access and execute',
    settings: [
      { label: 'Require approval for file writes', type: 'toggle', value: false },
      { label: 'Require approval for command execution', type: 'toggle', value: true },
      { label: 'Max concurrent agents', type: 'select', value: '5', options: ['1', '3', '5', '10'] },
      { label: 'Max task runtime (minutes)', type: 'text', value: '60' },
    ],
  },
  {
    id: 'git',
    icon: <GitBranch size={14} />,
    title: 'Git & Workspaces',
    description: 'Worktree and repository settings',
    settings: [
      { label: 'Auto-create worktrees', type: 'toggle', value: true },
      { label: 'Worktrees base path', type: 'text', value: '.worktrees/' },
      { label: 'Auto-push on completion', type: 'toggle', value: false },
      { label: 'Branch prefix', type: 'text', value: 'agent/' },
    ],
  },
  {
    id: 'notifications',
    icon: <Bell size={14} />,
    title: 'Notifications',
    description: 'When to alert you',
    settings: [
      { label: 'Task completed', type: 'toggle', value: true },
      { label: 'Task failed', type: 'toggle', value: true },
      { label: 'Review ready', type: 'toggle', value: true },
      { label: 'Agent error', type: 'toggle', value: true },
    ],
  },
  {
    id: 'appearance',
    icon: <Palette size={14} />,
    title: 'Appearance',
    description: 'Interface preferences',
    settings: [
      { label: 'Reduce motion', type: 'toggle', value: false },
      { label: 'Compact task cards', type: 'toggle', value: false },
      { label: 'Terminal font size', type: 'select', value: '12', options: ['11', '12', '13', '14'] },
    ],
  },
]

export function SettingsView() {
  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-5">
      <div className="mb-5">
        <h1 className="text-base font-semibold text-white">Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">Configure AgentOS runtime behaviour and preferences</p>
      </div>

      <div className="max-w-2xl space-y-4">
        {sections.map(section => (
          <GlassPanel key={section.id} className="p-5">
            <div className="flex items-start gap-3 mb-4 pb-4 border-b border-white/[0.06]">
              <div className="text-slate-400 mt-0.5">{section.icon}</div>
              <div>
                <h2 className="text-sm font-semibold text-white">{section.title}</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">{section.description}</p>
              </div>
            </div>

            <div className="space-y-4">
              {section.settings.map(setting => (
                <div key={setting.label} className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-300">{setting.label}</div>
                    {setting.description && (
                      <div className="text-[11px] text-slate-600 mt-0.5">{setting.description}</div>
                    )}
                  </div>

                  {setting.type === 'toggle' && (
                    <button
                      className={`relative w-9 h-5 rounded-full transition-all flex-shrink-0 ${
                        setting.value ? 'bg-crimson-600' : 'bg-white/10'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                        setting.value ? 'left-[18px]' : 'left-0.5'
                      }`} />
                    </button>
                  )}

                  {setting.type === 'text' && (
                    <input
                      defaultValue={setting.value as string}
                      className="w-28 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-white/20 transition-all font-mono text-right flex-shrink-0"
                    />
                  )}

                  {setting.type === 'select' && (
                    <select
                      defaultValue={setting.value as string}
                      className="w-20 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-slate-200 outline-none focus:border-white/20 transition-all font-mono flex-shrink-0 appearance-none text-center"
                    >
                      {setting.options?.map(o => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </GlassPanel>
        ))}

        {/* Danger zone */}
        <GlassPanel className="p-5 border border-crimson-800/30">
          <div className="flex items-start gap-3 mb-4 pb-4 border-b border-crimson-800/20">
            <Key size={14} className="text-crimson-400 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-crimson-300">Danger Zone</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Irreversible actions</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-300">Clear all workspaces</div>
              <div className="text-[11px] text-slate-600">Delete all worktrees and cached data</div>
            </div>
            <GlowButton variant="danger" size="sm">Clear Workspaces</GlowButton>
          </div>
        </GlassPanel>

        <div className="flex justify-end">
          <GlowButton variant="primary">Save Changes</GlowButton>
        </div>
      </div>
    </div>
  )
}
