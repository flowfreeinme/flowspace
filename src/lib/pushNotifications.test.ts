import { describe, expect, it } from 'vitest'
import { buildNotifyHour, formatNotificationBody } from './pushNotifications'

describe('buildNotifyHour', () => {
  it('converts 12 AM to 0', () => {
    expect(buildNotifyHour(12, 'AM')).toBe(0)
  })
  it('converts 8 AM to 8', () => {
    expect(buildNotifyHour(8, 'AM')).toBe(8)
  })
  it('converts 12 PM to 12', () => {
    expect(buildNotifyHour(12, 'PM')).toBe(12)
  })
  it('converts 8 PM to 20', () => {
    expect(buildNotifyHour(8, 'PM')).toBe(20)
  })
  it('converts 1 PM to 13', () => {
    expect(buildNotifyHour(1, 'PM')).toBe(13)
  })
})

describe('formatNotificationBody', () => {
  const tz = 'UTC'

  it('returns clear-schedule message when no events', () => {
    const result = formatNotificationBody([], tz)
    expect(result.title).toBe('Flowspace — Good morning')
    expect(result.body).toContain('No events today')
  })

  it('lists up to 3 timed events', () => {
    const events = [
      { title: 'Standup', start_time: '2026-06-05T13:00:00Z', all_day: false },
      { title: 'Design review', start_time: '2026-06-05T15:30:00Z', all_day: false },
      { title: '1:1', start_time: '2026-06-05T18:00:00Z', all_day: false },
    ]
    const result = formatNotificationBody(events, tz)
    expect(result.body).toContain('Standup')
    expect(result.body).toContain('Design review')
    expect(result.body).toContain('1:1')
    expect(result.body).not.toContain('more event')
  })

  it('shows overflow count when more than 3 events', () => {
    const events = Array.from({ length: 5 }, (_, i) => ({
      title: `Event ${i + 1}`,
      start_time: `2026-06-05T${String(9 + i).padStart(2, '0')}:00:00Z`,
      all_day: false,
    }))
    const result = formatNotificationBody(events, tz)
    expect(result.body).toContain('+ 2 more events')
    expect(result.body).not.toContain('Event 4')
  })

  it('shows singular "event" when 1 overflow', () => {
    const events = Array.from({ length: 4 }, (_, i) => ({
      title: `Event ${i + 1}`,
      start_time: `2026-06-05T${String(9 + i).padStart(2, '0')}:00:00Z`,
      all_day: false,
    }))
    const result = formatNotificationBody(events, tz)
    expect(result.body).toContain('+ 1 more event')
  })

  it('puts all-day events before timed events', () => {
    const events = [
      { title: 'Timed', start_time: '2026-06-05T09:00:00Z', all_day: false },
      { title: 'All Day Holiday', start_time: '2026-06-05T00:00:00Z', all_day: true },
    ]
    const result = formatNotificationBody(events, tz)
    const allDayPos = result.body.indexOf('All Day Holiday')
    const timedPos = result.body.indexOf('Timed')
    expect(allDayPos).toBeLessThan(timedPos)
  })
})
