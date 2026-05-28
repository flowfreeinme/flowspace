import { useWorkspace } from '@/stores/workspace'
import type { QuickCaptureConfig, QuickCaptureButton } from '@/types/widgetSettings'

interface QuickCaptureSettingsProps { config: QuickCaptureConfig }

export default function QuickCaptureSettings({ config }: QuickCaptureSettingsProps) {
  const { updateWidgetSettings } = useWorkspace()
  const patch = (p: Partial<QuickCaptureConfig>) => updateWidgetSettings('quickCapture', p)

  function toggleButton(id: QuickCaptureButton['id']) {
    patch({ buttons: config.buttons.map(b => b.id === id ? { ...b, enabled: !b.enabled } : b) })
  }

  function renameButton(id: QuickCaptureButton['id'], label: string) {
    patch({ buttons: config.buttons.map(b => b.id === id ? { ...b, label } : b) })
  }

  function moveButton(index: number, dir: -1 | 1) {
    const next = [...config.buttons]
    const swap = index + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[index], next[swap]] = [next[swap], next[index]]
    patch({ buttons: next })
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Quick Capture</p>
      <p className="text-[11px] text-gray-500">Toggle, rename, or reorder buttons.</p>

      <div className="space-y-2">
        {config.buttons.map((btn, i) => (
          <div key={btn.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={btn.enabled}
              onChange={() => toggleButton(btn.id)}
              className="accent-accent shrink-0"
            />
            <input
              defaultValue={btn.label}
              onBlur={e => renameButton(btn.id, e.target.value || btn.id)}
              maxLength={12}
              className="min-w-0 flex-1 rounded-md border border-surface-4 bg-surface-1 px-2 py-1 text-xs text-gray-200 outline-none focus:border-accent/50"
            />
            <button onClick={() => moveButton(i, -1)} disabled={i === 0}
              className="text-gray-600 hover:text-gray-300 disabled:opacity-30 text-xs">↑</button>
            <button onClick={() => moveButton(i, 1)} disabled={i === config.buttons.length - 1}
              className="text-gray-600 hover:text-gray-300 disabled:opacity-30 text-xs">↓</button>
          </div>
        ))}
      </div>
    </div>
  )
}
