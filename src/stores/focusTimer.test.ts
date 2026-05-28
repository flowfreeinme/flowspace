import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_FOCUS_TIMER_MINUTES, getFocusTimerSeconds } from '../lib/focusTimer'
import { resetFocusTimerStoreForTests, useFocusTimer } from './focusTimer'

describe('focus timer store', () => {
  beforeEach(() => {
    resetFocusTimerStoreForTests()
  })

  it('keeps a started timer running outside the home screen', () => {
    const start = 1_000

    useFocusTimer.getState().configure(25)
    useFocusTimer.getState().start(start)
    useFocusTimer.getState().tick(start + 5_000)

    expect(useFocusTimer.getState().running).toBe(true)
    expect(useFocusTimer.getState().remainingSeconds).toBe(getFocusTimerSeconds(25) - 5)
  })

  it('activates an alarm when the timer ends until the user stops it', () => {
    const start = 1_000

    useFocusTimer.getState().configure(1)
    useFocusTimer.getState().start(start)
    useFocusTimer.getState().tick(start + 60_000)

    expect(useFocusTimer.getState()).toMatchObject({
      running: false,
      remainingSeconds: 0,
      alarmActive: true,
    })

    useFocusTimer.getState().stopAlarm()

    expect(useFocusTimer.getState().alarmActive).toBe(false)
  })

  it('resets to the configured duration without losing the custom length', () => {
    useFocusTimer.getState().configure(90)
    useFocusTimer.getState().start(1_000)
    useFocusTimer.getState().tick(31_000)
    useFocusTimer.getState().reset()

    expect(useFocusTimer.getState()).toMatchObject({
      durationMinutes: 90,
      draftMinutes: '90',
      remainingSeconds: getFocusTimerSeconds(90),
      running: false,
      alarmActive: false,
    })
  })

  it('restores the default timer for tests', () => {
    expect(useFocusTimer.getState()).toMatchObject({
      durationMinutes: DEFAULT_FOCUS_TIMER_MINUTES,
      draftMinutes: String(DEFAULT_FOCUS_TIMER_MINUTES),
    })
  })
})
