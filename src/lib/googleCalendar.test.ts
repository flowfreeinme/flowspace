import { describe, expect, it } from 'vitest'
import { googleItemsToRows } from './googleCalendar'

describe('googleItemsToRows', () => {
  it('converts timed and all-day Google events to calendar rows', () => {
    const rows = googleItemsToRows([
      {
        summary: 'Planning session',
        location: 'Room 204',
        start: { dateTime: '2026-05-12T15:30:00-05:00' },
        end: { dateTime: '2026-05-12T16:00:00-05:00' },
      },
      {
        summary: 'Launch day',
        start: { date: '2026-05-13' },
        end: { date: '2026-05-14' },
      },
    ], 'user-1')

    expect(rows).toEqual([
      {
        user_id: 'user-1',
        title: 'Planning session',
        start_time: '2026-05-12T20:30:00.000Z',
        end_time: '2026-05-12T21:00:00.000Z',
        all_day: false,
        location: 'Room 204',
        color: '#34a853',
        source: 'google',
      },
      {
        user_id: 'user-1',
        title: 'Launch day',
        start_time: '2026-05-13T00:00:00.000Z',
        end_time: '2026-05-14T00:00:00.000Z',
        all_day: true,
        color: '#34a853',
        source: 'google',
      },
    ])
  })

  it('skips invalid events instead of throwing during sync', () => {
    expect(googleItemsToRows([
      { summary: 'No start' },
      { summary: 'Bad start', start: { dateTime: 'not-a-date' } },
      { start: { dateTime: '2026-05-12T12:00:00Z' } },
    ], 'user-1')).toEqual([
      {
        user_id: 'user-1',
        title: 'Untitled',
        start_time: '2026-05-12T12:00:00.000Z',
        end_time: '2026-05-12T12:00:00.000Z',
        all_day: false,
        color: '#34a853',
        source: 'google',
      },
    ])
  })

  it('can include Google event ids for incremental background sync upserts', () => {
    expect(googleItemsToRows([
      {
        id: 'google-event-1',
        summary: 'Office hours',
        start: { dateTime: '2026-05-12T12:00:00Z' },
      },
    ], 'user-1', { includeExternalId: true })).toEqual([
      {
        user_id: 'user-1',
        external_id: 'google-event-1',
        title: 'Office hours',
        start_time: '2026-05-12T12:00:00.000Z',
        end_time: '2026-05-12T12:00:00.000Z',
        all_day: false,
        color: '#34a853',
        source: 'google',
      },
    ])
  })
})
