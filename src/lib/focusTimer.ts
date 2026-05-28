export const MIN_FOCUS_TIMER_MINUTES = 1
export const MAX_FOCUS_TIMER_MINUTES = 480
export const DEFAULT_FOCUS_TIMER_MINUTES = 25
export const FOCUS_TIMER_PRESETS = [25, 50, 90] as const

export function clampFocusTimerMinutes(minutes: number) {
  if (!Number.isFinite(minutes)) return DEFAULT_FOCUS_TIMER_MINUTES
  return Math.min(MAX_FOCUS_TIMER_MINUTES, Math.max(MIN_FOCUS_TIMER_MINUTES, Math.round(minutes)))
}

export function getFocusTimerSeconds(minutes: number) {
  return clampFocusTimerMinutes(minutes) * 60
}

export function formatFocusTimerSeconds(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0))
  const mins = Math.floor(safeSeconds / 60)
  const secs = safeSeconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
