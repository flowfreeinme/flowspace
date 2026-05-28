import { useWorkspace } from '@/stores/workspace'
import type { TodayConfig } from '@/types/widgetSettings'

interface TodaySettingsProps { config: TodayConfig }

export default function TodaySettings({ config }: TodaySettingsProps) {
  const { updateWidgetSettings } = useWorkspace()
  const patch = (p: Partial<TodayConfig>) => updateWidgetSettings('today', p)

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Today</p>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Greeting</label>
        <input
          defaultValue={config.greeting}
          onBlur={e => patch({ greeting: e.target.value })}
          maxLength={40}
          className="w-full rounded-md border border-surface-4 bg-surface-1 px-2 py-1 text-xs text-gray-200 outline-none focus:border-accent/50"
          placeholder="Good morning"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Date format</label>
        <select
          value={config.dateFormat}
          onChange={e => patch({ dateFormat: e.target.value as TodayConfig['dateFormat'] })}
          className="w-full rounded-md border border-surface-4 bg-surface-1 px-2 py-1 text-xs text-gray-200 outline-none"
        >
          <option value="weekday-month-day">Wednesday, May 18</option>
          <option value="month-day-year">May 18, 2026</option>
          <option value="mm-dd-yyyy">05/18/2026</option>
        </select>
      </div>

      {([
        ['showClock', 'Show clock'],
        ['showNextEvent', 'Show next event'],
        ['showWeatherSummary', 'Show weather summary'],
        ['showPagesCreatedToday', 'Show pages created today'],
      ] as [keyof TodayConfig, string][]).map(([key, label]) => (
        <label key={key} className="flex items-center justify-between text-xs text-gray-300">
          {label}
          <input
            type="checkbox"
            checked={config[key] as boolean}
            onChange={e => patch({ [key]: e.target.checked })}
            className="accent-accent"
          />
        </label>
      ))}
    </div>
  )
}
