import { describe, expect, it } from 'vitest'
import { buildWorkflowContext, formatCalendarEventsForAi, resolveCalendarRangeForPrompt } from './aiContext'
import type { CalendarEvent } from '@/types/calendar'
import type { Page } from '@/types'

function localDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

describe('formatCalendarEventsForAi', () => {
  it('keeps calendar times and locations for day planning', () => {
    const events: CalendarEvent[] = [{
      id: 'lab',
      title: 'Chemistry lab',
      start: new Date('2026-05-24T09:30:00'),
      end: new Date('2026-05-24T11:15:00'),
      allDay: false,
      location: 'Science Hall',
      source: 'google' as const,
    }]

    expect(formatCalendarEventsForAi(events, new Date('2026-05-24T08:00:00'))).toEqual([{
      title: 'Chemistry lab',
      date: 'May 24, 9:30 AM-11:15 AM',
      start: '2026-05-24',
      end: '2026-05-24',
      startTime: '09:30',
      endTime: '11:15',
      allDay: false,
      location: 'Science Hall',
    }])
  })

  it('includes every current-month event requested by the prompt in chronological order', () => {
    const events: CalendarEvent[] = Array.from({ length: 16 }, (_, index) => ({
      id: `event-${index}`,
      title: `Event ${index + 1}`,
      start: new Date(`2026-05-${String(24 + Math.floor(index / 3)).padStart(2, '0')}T${String(18 - (index % 3)).padStart(2, '0')}:00:00`),
      end: new Date(`2026-05-${String(24 + Math.floor(index / 3)).padStart(2, '0')}T${String(19 - (index % 3)).padStart(2, '0')}:00:00`),
      allDay: false,
      source: 'google' as const,
    })).reverse()

    const result = formatCalendarEventsForAi(events, new Date('2026-05-24T10:00:00'), {
      prompt: 'create a timeline for this month',
    })

    expect(result).toHaveLength(16)
    expect(result.map(event => event.title).slice(0, 3)).toEqual(['Event 3', 'Event 2', 'Event 1'])
  })

  it('filters exact from-date-to-date requests and keeps earliest events first', () => {
    const events: CalendarEvent[] = [
      { id: 'before', title: 'Before range', start: new Date('2026-05-23T09:00:00'), end: new Date('2026-05-23T10:00:00'), allDay: false, source: 'google' },
      { id: 'late', title: 'Later in range', start: new Date('2026-05-27T12:00:00'), end: new Date('2026-05-27T13:00:00'), allDay: false, source: 'google' },
      { id: 'early', title: 'Earlier in range', start: new Date('2026-05-25T08:00:00'), end: new Date('2026-05-25T09:00:00'), allDay: false, source: 'google' },
      { id: 'after', title: 'After range', start: new Date('2026-05-29T08:00:00'), end: new Date('2026-05-29T09:00:00'), allDay: false, source: 'google' },
    ]

    const result = formatCalendarEventsForAi(events, new Date('2026-05-24T10:00:00'), {
      prompt: 'make a timeline from May 25 to May 27',
    })

    expect(result.map(event => event.title)).toEqual(['Earlier in range', 'Later in range'])
  })
})

describe('resolveCalendarRangeForPrompt', () => {
  it('uses the current date for relative week requests', () => {
    const range = resolveCalendarRangeForPrompt('timeline for this week', new Date('2026-05-24T13:30:00'))

    expect(range.label).toBe('this week')
    expect(localDate(range.start)).toBe('2026-05-24')
    expect(localDate(range.end)).toBe('2026-05-30')
  })

  it('understands rest-of-month requests from the current date', () => {
    const range = resolveCalendarRangeForPrompt('timeline of the rest of may', new Date('2026-05-24T13:30:00'))

    expect(range.label).toBe('rest of May')
    expect(localDate(range.start)).toBe('2026-05-24')
    expect(localDate(range.end)).toBe('2026-05-31')
  })
})

describe('buildWorkflowContext', () => {
  it('summarizes timeline, kanban, and flowchart blocks for AI planning', () => {
    const page: Page = {
      id: 'day',
      title: 'Day plan',
      icon: '📅',
      children: [],
      parentId: null,
      createdAt: 0,
      updatedAt: 0,
      boardMode: true,
      blocks: [
        {
          id: 'timeline',
          type: 'timeline',
          content: JSON.stringify({
            x: 0, y: 0, width: 520, height: 360,
            dateRange: { start: '2026-05-24', end: '2026-05-24' },
            groups: [{
              id: 'g1',
              label: 'Class',
              bars: [{
                id: 'lecture',
                label: 'Physics lecture',
                start: '2026-05-24',
                end: '2026-05-24',
                startTime: '13:00',
                endTime: '14:15',
                location: 'Room 204',
                color: '#7c6af7',
              }],
            }],
          }),
        },
        {
          id: 'kanban',
          type: 'kanban',
          content: JSON.stringify({
            x: 0, y: 0, width: 520, height: 360,
            columns: [{
              id: 'todo',
              title: 'To Do',
              cards: [{ id: 'problem-set', text: 'Finish problem set', assignee: 'Michael' }],
            }],
          }),
        },
        {
          id: 'flowchart',
          type: 'flowchart',
          content: JSON.stringify({
            x: 0, y: 0, width: 520, height: 360,
            nodes: [
              { id: 'start', label: 'Review notes', type: 'start', x: 0, y: 0 },
              { id: 'quiz', label: 'Take quiz', type: 'process', x: 160, y: 0 },
            ],
            edges: [{ from: 'start', to: 'quiz', label: 'then' }],
          }),
        },
      ],
    }

    expect(buildWorkflowContext([page])).toEqual([
      {
        type: 'timeline',
        pageTitle: 'Day plan',
        items: ['Class: Physics lecture on 2026-05-24 13:00-14:15 at Room 204'],
      },
      {
        type: 'kanban',
        pageTitle: 'Day plan',
        items: ['To Do: Finish problem set (Michael)'],
      },
      {
        type: 'flowchart',
        pageTitle: 'Day plan',
        items: ['Nodes: Review notes, Take quiz', 'Flow: Review notes -> Take quiz (then)'],
      },
    ])
  })
})
