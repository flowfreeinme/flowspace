import { describe, expect, it } from 'vitest'
import { getTimedEventBlock } from './calendarLayout'

describe('getTimedEventBlock', () => {
  it('positions events by their start minute and duration', () => {
    const block = getTimedEventBlock({
      day: new Date('2026-05-12T00:00:00'),
      start: new Date('2026-05-12T13:30:00'),
      end: new Date('2026-05-12T14:45:00'),
      hourHeight: 56,
    })

    expect(block).toEqual({ top: 13.5 * 56, height: 1.25 * 56 })
  })

  it('clamps events to the visible day', () => {
    const block = getTimedEventBlock({
      day: new Date('2026-05-12T00:00:00'),
      start: new Date('2026-05-11T23:30:00'),
      end: new Date('2026-05-12T01:15:00'),
      hourHeight: 44,
    })

    expect(block).toEqual({ top: 0, height: 1.25 * 44 })
  })

  it('keeps very short events tappable', () => {
    const block = getTimedEventBlock({
      day: new Date('2026-05-12T00:00:00'),
      start: new Date('2026-05-12T09:00:00'),
      end: new Date('2026-05-12T09:05:00'),
      hourHeight: 56,
      minHeight: 20,
    })

    expect(block).toEqual({ top: 9 * 56, height: 20 })
  })
})
