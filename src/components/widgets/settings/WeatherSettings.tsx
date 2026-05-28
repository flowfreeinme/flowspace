import { useWorkspace } from '@/stores/workspace'
import type { WeatherConfig } from '@/types/widgetSettings'

interface WeatherSettingsProps { config: WeatherConfig }

export default function WeatherSettings({ config }: WeatherSettingsProps) {
  const { updateWidgetSettings } = useWorkspace()
  const patch = (p: Partial<WeatherConfig>) => updateWidgetSettings('weather', p)

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Weather</p>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Temperature unit</label>
        <div className="flex gap-2">
          {(['F', 'C'] as const).map(v => (
            <button key={v} onClick={() => patch({ unit: v })}
              className={`flex-1 rounded-md border px-2 py-1 text-xs transition-colors ${config.unit === v ? 'border-accent/50 bg-accent/10 text-accent' : 'border-surface-4 bg-surface-1 text-gray-400 hover:text-gray-200'}`}>
              °{v}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Forecast</label>
        <div className="flex gap-2">
          {([1, 3] as const).map(v => (
            <button key={v} onClick={() => patch({ forecastDays: v })}
              className={`flex-1 rounded-md border px-2 py-1 text-xs transition-colors ${config.forecastDays === v ? 'border-accent/50 bg-accent/10 text-accent' : 'border-surface-4 bg-surface-1 text-gray-400 hover:text-gray-200'}`}>
              {v === 1 ? 'Today only' : '3-day'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Show details</label>
        {([
          ['showHumidity', 'Humidity'],
          ['showWind', 'Wind'],
          ['showPrecipitation', 'Precipitation'],
          ['showFeelsLike', 'Feels like'],
          ['showUvIndex', 'UV index'],
          ['showSunriseSunset', 'Sunrise / sunset'],
        ] as [keyof WeatherConfig, string][]).map(([key, label]) => (
          <label key={key} className="flex items-center justify-between text-xs text-gray-300">
            {label}
            <input type="checkbox" checked={config[key] as boolean}
              onChange={e => patch({ [key]: e.target.checked })} className="accent-accent" />
          </label>
        ))}
      </div>
    </div>
  )
}
