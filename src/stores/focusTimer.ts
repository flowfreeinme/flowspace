import { create } from 'zustand'
import {
  DEFAULT_FOCUS_TIMER_MINUTES,
  clampFocusTimerMinutes,
  getFocusTimerSeconds,
} from '../lib/focusTimer'

interface FocusTimerState {
  durationMinutes: number
  draftMinutes: string
  remainingSeconds: number
  running: boolean
  targetEndAt: number | null
  alarmActive: boolean
  setDraftMinutes: (value: string) => void
  applyDraft: () => void
  configure: (minutes: number) => void
  adjust: (deltaMinutes: number) => void
  start: (now?: number) => void
  pause: (now?: number) => void
  toggle: (now?: number) => void
  reset: () => void
  stopAlarm: () => void
  tick: (now?: number) => void
}

function initialFocusTimerState() {
  return {
    durationMinutes: DEFAULT_FOCUS_TIMER_MINUTES,
    draftMinutes: String(DEFAULT_FOCUS_TIMER_MINUTES),
    remainingSeconds: getFocusTimerSeconds(DEFAULT_FOCUS_TIMER_MINUTES),
    running: false,
    targetEndAt: null,
    alarmActive: false,
  }
}

function remainingFromTarget(targetEndAt: number | null, now: number) {
  if (!targetEndAt) return 0
  return Math.max(0, Math.ceil((targetEndAt - now) / 1000))
}

export const useFocusTimer = create<FocusTimerState>((set, get) => ({
  ...initialFocusTimerState(),

  setDraftMinutes(value) {
    set({ draftMinutes: value })
  },

  applyDraft() {
    const parsedMinutes = Number.parseInt(get().draftMinutes, 10)
    get().configure(Number.isFinite(parsedMinutes) ? parsedMinutes : get().durationMinutes)
  },

  configure(minutes) {
    const durationMinutes = clampFocusTimerMinutes(minutes)
    set({
      durationMinutes,
      draftMinutes: String(durationMinutes),
      remainingSeconds: getFocusTimerSeconds(durationMinutes),
      running: false,
      targetEndAt: null,
      alarmActive: false,
    })
  },

  adjust(deltaMinutes) {
    get().configure(get().durationMinutes + deltaMinutes)
  },

  start(now = Date.now()) {
    const remainingSeconds = get().remainingSeconds > 0
      ? get().remainingSeconds
      : getFocusTimerSeconds(get().durationMinutes)

    set({
      remainingSeconds,
      running: true,
      targetEndAt: now + remainingSeconds * 1000,
      alarmActive: false,
    })
  },

  pause(now = Date.now()) {
    const { targetEndAt } = get()
    set({
      remainingSeconds: remainingFromTarget(targetEndAt, now),
      running: false,
      targetEndAt: null,
    })
  },

  toggle(now = Date.now()) {
    if (get().running) get().pause(now)
    else get().start(now)
  },

  reset() {
    set({
      remainingSeconds: getFocusTimerSeconds(get().durationMinutes),
      running: false,
      targetEndAt: null,
      alarmActive: false,
    })
  },

  stopAlarm() {
    set({ alarmActive: false })
  },

  tick(now = Date.now()) {
    const { running, targetEndAt, remainingSeconds } = get()
    if (!running || !targetEndAt) return

    const nextRemainingSeconds = remainingFromTarget(targetEndAt, now)
    if (nextRemainingSeconds <= 0) {
      set({
        remainingSeconds: 0,
        running: false,
        targetEndAt: null,
        alarmActive: true,
      })
      return
    }

    if (nextRemainingSeconds !== remainingSeconds) {
      set({ remainingSeconds: nextRemainingSeconds })
    }
  },
}))

export function resetFocusTimerStoreForTests() {
  useFocusTimer.setState(initialFocusTimerState())
}
