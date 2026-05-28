import { describe, expect, it } from 'vitest'
import {
  clampFocusTimerMinutes,
  formatFocusTimerSeconds,
  getFocusTimerSeconds,
} from './focusTimer'

describe('focus timer helpers', () => {
  it('formats remaining seconds as a padded timer', () => {
    expect(formatFocusTimerSeconds(1500)).toBe('25:00')
    expect(formatFocusTimerSeconds(65)).toBe('01:05')
    expect(formatFocusTimerSeconds(0)).toBe('00:00')
  })

  it('keeps focus timer length within a useful range', () => {
    expect(clampFocusTimerMinutes(0)).toBe(1)
    expect(clampFocusTimerMinutes(37)).toBe(37)
    expect(clampFocusTimerMinutes(999)).toBe(480)
  })

  it('converts clamped minutes to seconds', () => {
    expect(getFocusTimerSeconds(25)).toBe(1500)
    expect(getFocusTimerSeconds(0)).toBe(60)
  })
})
