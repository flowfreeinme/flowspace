import { describe, expect, it } from 'vitest'
import { buildCalendarTimelineResponse } from './aiCalendarTimeline'
import type { CalendarEvent } from '@/types/calendar'

describe('buildCalendarTimelineResponse', () => {
  it('creates a timeline action from every calendar event in the requested rest-of-month range', () => {
    const events: CalendarEvent[] = [
      { id: 'later', title: 'Later class', start: new Date('2026-05-26T15:00:00'), end: new Date('2026-05-26T16:00:00'), allDay: false, source: 'google' },
      { id: 'before', title: 'Before today', start: new Date('2026-05-20T09:00:00'), end: new Date('2026-05-20T10:00:00'), allDay: false, source: 'google' },
      { id: 'first', title: 'Morning exam', start: new Date('2026-05-24T09:30:00'), end: new Date('2026-05-24T11:15:00'), allDay: false, location: 'Science Hall', source: 'google' },
      { id: 'after', title: 'June meeting', start: new Date('2026-06-01T10:00:00'), end: new Date('2026-06-01T11:00:00'), allDay: false, source: 'google' },
    ]

    const response = buildCalendarTimelineResponse('make a timeline of the rest of may', events, new Date('2026-05-24T08:00:00'))

    expect(response?.actions).toHaveLength(1)
    expect(response?.actions[0]).toMatchObject({
      type: 'create_workflow',
      workflowType: 'timeline',
      title: 'Calendar: rest of May',
      items: [
        { title: 'Morning exam', start: '2026-05-24', end: '2026-05-24', startTime: '09:30', endTime: '11:15', location: 'Science Hall' },
        { title: 'Later class', start: '2026-05-26', end: '2026-05-26', startTime: '15:00', endTime: '16:00' },
      ],
    })
  })

  it('does not create fake timeline items when no calendar events match', () => {
    const response = buildCalendarTimelineResponse('timeline for the rest of may', [], new Date('2026-05-24T08:00:00'))

    expect(response?.actions).toEqual([])
    expect(response?.message).toContain('No calendar events')
  })
})
