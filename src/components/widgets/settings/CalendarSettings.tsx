import { useWorkspace } from '@/stores/workspace'
import type { CalendarConfig } from '@/types/widgetSettings'

interface CalendarSettingsProps { config: CalendarConfig }

export default function CalendarSettings({ config }: CalendarSettingsProps) {
  const { updateWidgetSettings } = useWorkspace()
  const patch = (p: Partial<CalendarConfig>) => updateWidgetSettings('calendar', p)

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Calendar</p>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Week starts on</label>
        <div className="flex gap-2">
          {([['sunday', 'Sunday'], ['monday', 'Monday']] as const).map(([v, label]) => (
            <button key={v} onClick={() => patch({ weekStartsOn: v })}
              className={`flex-1 rounded-md border px-2 py-1 text-xs transition-colors ${config.weekStartsOn === v ? 'border-accent/50 bg-accent/10 text-accent' : 'border-surface-4 bg-surface-1 text-gray-400 hover:text-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {([
        ['showWeekends', 'Show weekends'],
        ['showEventTimes', 'Show event times'],
      ] as [keyof CalendarConfig, string][]).map(([key, label]) => (
        <label key={key} className="flex items-center justify-between text-xs text-gray-300">
          {label}
          <input type="checkbox" checked={config[key] as boolean}
            onChange={e => patch({ [key]: e.target.checked })} className="accent-accent" />
        </label>
      ))}
    </div>
  )
}
