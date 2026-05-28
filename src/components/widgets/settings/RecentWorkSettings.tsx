import { useWorkspace } from '@/stores/workspace'
import type { RecentWorkConfig } from '@/types/widgetSettings'

interface RecentWorkSettingsProps { config: RecentWorkConfig }

export default function RecentWorkSettings({ config }: RecentWorkSettingsProps) {
  const { updateWidgetSettings } = useWorkspace()
  const patch = (p: Partial<RecentWorkConfig>) => updateWidgetSettings('recent', p)

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Recent Work</p>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Widget title</label>
        <input
          defaultValue={config.title}
          onBlur={e => patch({ title: e.target.value })}
          maxLength={30}
          className="w-full rounded-md border border-surface-4 bg-surface-1 px-2 py-1 text-xs text-gray-200 outline-none focus:border-accent/50"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Items shown: {config.itemCount}</label>
        <input
          type="range" min={3} max={10} value={config.itemCount}
          onChange={e => patch({ itemCount: Number(e.target.value) })}
          className="w-full accent-accent"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Show</label>
        <div className="flex gap-2">
          {(['all', 'pages', 'boards'] as const).map(v => (
            <button key={v} onClick={() => patch({ filter: v })}
              className={`flex-1 rounded-md border px-2 py-1 text-xs capitalize transition-colors ${config.filter === v ? 'border-accent/50 bg-accent/10 text-accent' : 'border-surface-4 bg-surface-1 text-gray-400 hover:text-gray-200'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Sort by</label>
        <div className="flex gap-2">
          {([['lastOpened', 'Last opened'], ['lastModified', 'Last modified']] as const).map(([v, label]) => (
            <button key={v} onClick={() => patch({ sortBy: v })}
              className={`flex-1 rounded-md border px-2 py-1 text-xs transition-colors ${config.sortBy === v ? 'border-accent/50 bg-accent/10 text-accent' : 'border-surface-4 bg-surface-1 text-gray-400 hover:text-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
