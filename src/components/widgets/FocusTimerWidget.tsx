import { Minus, Pause, Play, RotateCcw, Timer, Plus } from 'lucide-react'
import { useFocusTimer } from '@/stores/focusTimer'
import {
  formatFocusTimerSeconds,
  MAX_FOCUS_TIMER_MINUTES,
  MIN_FOCUS_TIMER_MINUTES,
} from '@/lib/focusTimer'
import type { FocusTimerConfig } from '@/types/widgetSettings'

export default function FocusTimerWidget({ config }: { config: FocusTimerConfig }) {
  const {
    durationMinutes,
    draftMinutes,
    remainingSeconds,
    running,
    alarmActive,
    setDraftMinutes,
    applyDraft,
    configure,
    adjust,
    reset,
    toggle,
    stopAlarm,
  } = useFocusTimer()

  const totalSeconds = Math.max(1, durationMinutes * 60)
  const elapsedPercent = Math.min(100, Math.max(0, ((totalSeconds - remainingSeconds) / totalSeconds) * 100))

  const timerStatus = alarmActive
    ? 'Timer is up'
    : remainingSeconds === 0
      ? 'Sprint complete'
      : running
        ? 'Focus mode active'
        : `${durationMinutes} minute sprint`

  const timerBadgeClass = alarmActive
    ? 'border-red-400/30 bg-red-500/10 text-red-200'
    : running
      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
      : 'border-surface-4 bg-surface-2 text-gray-500'
  const timerBadgeLabel = alarmActive ? 'Up' : running ? 'Live' : 'Ready'

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gradient-to-br from-surface-1 via-surface-1 to-emerald-500/10 p-3">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-emerald-300">
          <Timer size={13} />
          Max focus
        </div>
        <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${timerBadgeClass}`}>
          {timerBadgeLabel}
        </span>
      </div>

      <div className="my-auto min-h-0 py-1.5">
        <div className="flex items-end justify-between gap-2">
          <p className="text-3xl font-semibold leading-none text-white tabular-nums md:text-4xl">
            {formatFocusTimerSeconds(remainingSeconds)}
          </p>
          <p className="pb-0.5 text-[11px] font-medium text-gray-500">{timerStatus}</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all duration-300"
            style={{ width: `${elapsedPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-auto shrink-0 space-y-1.5">
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${Math.min(4, config.presets.length + 1)}, minmax(0, 1fr))` }}
        >
          {config.presets.map(preset => (
            <button
              key={preset.minutes}
              onClick={() => configure(preset.minutes)}
              data-home-widget-edit-control="true"
              className={`rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
                durationMinutes === preset.minutes
                  ? 'border-emerald-400/35 bg-emerald-400/10 text-emerald-200'
                  : 'border-surface-3 bg-surface-2 text-gray-500 hover:border-emerald-400/25 hover:text-gray-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <label
            data-home-widget-edit-control="true"
            className="flex min-w-0 items-center gap-1 rounded-lg border border-surface-3 bg-surface-2 px-1.5 py-1 text-[11px] text-gray-500 focus-within:border-emerald-400/40"
          >
            <input
              type="number"
              min={MIN_FOCUS_TIMER_MINUTES}
              max={MAX_FOCUS_TIMER_MINUTES}
              inputMode="numeric"
              value={draftMinutes}
              onChange={event => setDraftMinutes(event.target.value)}
              onBlur={applyDraft}
              onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }}
              className="min-w-0 flex-1 bg-transparent text-right text-xs font-semibold text-white tabular-nums outline-none"
              aria-label="Custom focus timer minutes"
            />
            <span>m</span>
          </label>
        </div>

        <div className="flex items-center gap-1.5">
          {alarmActive ? (
            <button
              onClick={stopAlarm}
              data-home-widget-edit-control="true"
              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-500 px-3 text-xs font-semibold text-white transition-colors hover:bg-red-400"
            >
              Stop alarm
            </button>
          ) : (
            <button
              onClick={() => toggle()}
              data-home-widget-edit-control="true"
              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-surface-0 transition-colors hover:bg-emerald-400"
            >
              {running ? <Pause size={13} /> : <Play size={13} />}
              {running ? 'Pause' : 'Start'}
            </button>
          )}
          <button data-home-widget-edit-control="true" onClick={reset} className="home-widget-control border border-surface-3 bg-surface-2" title="Reset timer">
            <RotateCcw size={13} />
          </button>
          <button data-home-widget-edit-control="true" onClick={() => adjust(-5)} className="home-widget-control border border-surface-3 bg-surface-2" title="Shorter sprint">
            <Minus size={13} />
          </button>
          <button data-home-widget-edit-control="true" onClick={() => adjust(5)} className="home-widget-control border border-surface-3 bg-surface-2" title="Longer sprint">
            <Plus size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
