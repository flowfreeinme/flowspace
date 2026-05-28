import { useWorkspace } from '@/stores/workspace'
import type { ProPlannerConfig } from '@/types/widgetSettings'

interface ProPlannerSettingsProps { config: ProPlannerConfig }

export default function ProPlannerSettings({ config }: ProPlannerSettingsProps) {
  const { updateWidgetSettings } = useWorkspace()
  const patch = (p: Partial<ProPlannerConfig>) => updateWidgetSettings('proPlanner', p)

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">AI Day Planner</p>

      <div className="flex gap-2">
        <div className="flex-1 space-y-1">
          <label className="text-xs text-gray-400">Work start</label>
          <input type="time" defaultValue={config.workStart}
            onBlur={e => patch({ workStart: e.target.value })}
            className="w-full rounded-md border border-surface-4 bg-surface-1 px-2 py-1 text-xs text-gray-200 outline-none" />
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-xs text-gray-400">Work end</label>
          <input type="time" defaultValue={config.workEnd}
            onBlur={e => patch({ workEnd: e.target.value })}
            className="w-full rounded-md border border-surface-4 bg-surface-1 px-2 py-1 text-xs text-gray-200 outline-none" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Focus style</label>
        <div className="flex gap-1">
          {([['deep-work', 'Deep work'], ['meetings', 'Meetings'], ['balanced', 'Balanced']] as const).map(([v, label]) => (
            <button key={v} onClick={() => patch({ focusStyle: v })}
              className={`flex-1 rounded-md border px-1.5 py-1 text-[11px] transition-colors ${config.focusStyle === v ? 'border-accent/50 bg-accent/10 text-accent' : 'border-surface-4 bg-surface-1 text-gray-400 hover:text-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Custom instructions <span className="text-gray-600">({config.customInstructions.length}/200)</span></label>
        <textarea
          defaultValue={config.customInstructions}
          onBlur={e => patch({ customInstructions: e.target.value.slice(0, 200) })}
          rows={3} maxLength={200} placeholder="Prioritize creative work in the morning…"
          className="w-full resize-none rounded-md border border-surface-4 bg-surface-1 px-2 py-1 text-xs text-gray-200 outline-none focus:border-accent/50"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Refresh</label>
        <div className="flex gap-2 items-center">
          {(['manual', 'auto'] as const).map(v => (
            <button key={v} onClick={() => patch({ refreshMode: v })}
              className={`rounded-md border px-2 py-1 text-xs capitalize transition-colors ${config.refreshMode === v ? 'border-accent/50 bg-accent/10 text-accent' : 'border-surface-4 bg-surface-1 text-gray-400 hover:text-gray-200'}`}>
              {v}
            </button>
          ))}
          {config.refreshMode === 'auto' && (
            <input type="time" defaultValue={config.autoRefreshTime}
              onBlur={e => patch({ autoRefreshTime: e.target.value })}
              className="rounded-md border border-surface-4 bg-surface-1 px-2 py-1 text-xs text-gray-200 outline-none" />
          )}
        </div>
      </div>
    </div>
  )
}
