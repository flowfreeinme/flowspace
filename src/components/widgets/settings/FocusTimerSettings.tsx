import { useWorkspace } from '@/stores/workspace'
import type { FocusTimerConfig, FocusTimerPreset } from '@/types/widgetSettings'

interface FocusTimerSettingsProps { config: FocusTimerConfig }

export default function FocusTimerSettings({ config }: FocusTimerSettingsProps) {
  const { updateWidgetSettings } = useWorkspace()
  const patch = (p: Partial<FocusTimerConfig>) => updateWidgetSettings('focusTimer', p)

  function updatePreset(index: number, changes: Partial<FocusTimerPreset>) {
    const next = config.presets.map((p, i) => i === index ? { ...p, ...changes } : p)
    patch({ presets: next })
  }

  function addPreset() {
    if (config.presets.length >= 6) return
    patch({ presets: [...config.presets, { label: 'Custom', minutes: 30 }] })
  }

  function removePreset(index: number) {
    if (config.presets.length <= 1) return
    patch({ presets: config.presets.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Focus Timer</p>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Presets</label>
        <div className="space-y-1.5">
          {config.presets.map((preset, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                defaultValue={preset.label} onBlur={e => updatePreset(i, { label: e.target.value || `${preset.minutes}m` })}
                maxLength={10}
                className="w-20 rounded-md border border-surface-4 bg-surface-1 px-2 py-1 text-xs text-gray-200 outline-none focus:border-accent/50"
                placeholder="Label"
              />
              <input
                type="number" min={1} max={180} defaultValue={preset.minutes}
                onBlur={e => {
                  const v = Math.min(180, Math.max(1, Number(e.target.value) || 1))
                  updatePreset(i, { minutes: v })
                }}
                className="w-16 rounded-md border border-surface-4 bg-surface-1 px-2 py-1 text-xs text-gray-200 outline-none focus:border-accent/50"
              />
              <span className="text-xs text-gray-600">min</span>
              <button onClick={() => removePreset(i)} disabled={config.presets.length <= 1}
                className="ml-auto text-xs text-gray-600 hover:text-red-400 disabled:opacity-30">✕</button>
            </div>
          ))}
          {config.presets.length < 6 && (
            <button onClick={addPreset} className="text-xs text-gray-500 hover:text-gray-300">+ Add preset</button>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <label className="flex items-center justify-between text-xs text-gray-300">
          Break timer
          <input type="checkbox" checked={config.breakEnabled}
            onChange={e => patch({ breakEnabled: e.target.checked })} className="accent-accent" />
        </label>
        {config.breakEnabled && (
          <div className="flex gap-1 pl-2">
            {([5, 10, 15] as const).map(v => (
              <button key={v} onClick={() => patch({ breakMinutes: v })}
                className={`flex-1 rounded-md border px-2 py-1 text-xs transition-colors ${config.breakMinutes === v ? 'border-accent/50 bg-accent/10 text-accent' : 'border-surface-4 bg-surface-1 text-gray-400 hover:text-gray-200'}`}>
                {v}m
              </button>
            ))}
          </div>
        )}
      </div>

      <label className="flex items-center justify-between text-xs text-gray-300">
        Auto-start next session
        <input type="checkbox" checked={config.autoStart}
          onChange={e => patch({ autoStart: e.target.checked })} className="accent-accent" />
      </label>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Completion sound</label>
        <div className="flex gap-1">
          {(['off', 'chime', 'bell'] as const).map(v => (
            <button key={v} onClick={() => patch({ completionSound: v })}
              className={`flex-1 rounded-md border px-2 py-1 text-xs capitalize transition-colors ${config.completionSound === v ? 'border-accent/50 bg-accent/10 text-accent' : 'border-surface-4 bg-surface-1 text-gray-400 hover:text-gray-200'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400">Daily goal</label>
        <div className="flex gap-1">
          {([0, 2, 4, 6, 8] as const).map(v => (
            <button key={v} onClick={() => patch({ dailyGoal: v })}
              className={`flex-1 rounded-md border px-1 py-1 text-xs transition-colors ${config.dailyGoal === v ? 'border-accent/50 bg-accent/10 text-accent' : 'border-surface-4 bg-surface-1 text-gray-400 hover:text-gray-200'}`}>
              {v === 0 ? 'Off' : v}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
