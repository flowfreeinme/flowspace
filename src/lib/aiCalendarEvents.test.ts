import { describe, expect, it, vi } from 'vitest'
import { getCalendarEventsForAi, shouldRefreshCalendarForPrompt } from './aiCalendarEvents'
import type { CalendarEvent } from '@/types/calendar'

const event: CalendarEvent = {
  id: 'event-1',
  title: 'Loaded event',
  start: new Date('2026-05-25T09:00:00'),
  end: new Date('2026-05-25T10:00:00'),
  allDay: false,
  source: 'google',
}

describe('shouldRefreshCalendarForPrompt', () => {
  it('detects date and calendar prompts', () => {
    expect(shouldRefreshCalendarForPrompt('make a timeline for the rest of May')).toBe(true)
    expect(shouldRefreshCalendarForPrompt('what events are on my calendar this week')).toBe(true)
    expect(shouldRefreshCalendarForPrompt('rewrite this sentence')).toBe(false)
  })
})

describe('getCalendarEventsForAi', () => {
  it('loads fresh calendar events before date-based AI prompts', async () => {
    const loadEvents = vi.fn(async () => {})
    const result = await getCalendarEventsForAi({
      prompt: 'create a timeline of the rest of May',
      currentEvents: [],
      userId: 'user-1',
      loadEvents,
      getEvents: () => [event],
    })

    expect(loadEvents).toHaveBeenCalledWith('user-1')
    expect(result).toEqual([event])
  })

  it('does not refresh for prompts that do not mention dates or calendar', async () => {
    const loadEvents = vi.fn(async () => {})
    const result = await getCalendarEventsForAi({
      prompt: 'add a section called Ideas',
      currentEvents: [],
      userId: 'user-1',
      loadEvents,
      getEvents: () => [event],
    })

    expect(loadEvents).not.toHaveBeenCalled()
    expect(result).toEqual([])
  })
})
