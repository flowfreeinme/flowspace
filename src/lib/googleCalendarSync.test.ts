import { describe, expect, it } from 'vitest'
import {
  buildGoogleCalendarEventListUrl,
  buildGoogleCalendarWatchBody,
  getGoogleCalendarSyncMode,
} from './googleCalendarSync'

describe('google calendar background sync helpers', () => {
  it('uses a sync token for incremental background syncs', () => {
    const url = new URL(buildGoogleCalendarEventListUrl({
      syncToken: 'sync-token-1',
    }))

    expect(url.origin + url.pathname).toBe('https://www.googleapis.com/calendar/v3/calendars/primary/events')
    expect(url.searchParams.get('syncToken')).toBe('sync-token-1')
    expect(url.searchParams.get('singleEvents')).toBe('true')
    expect(url.searchParams.has('timeMin')).toBe(false)
    expect(url.searchParams.has('orderBy')).toBe(false)
    expect(getGoogleCalendarSyncMode({ syncToken: 'sync-token-1' })).toBe('incremental')
  })

  it('falls back to a recent full sync when no sync token exists', () => {
    const url = new URL(buildGoogleCalendarEventListUrl({
      now: new Date('2026-05-26T12:00:00.000Z'),
    }))

    expect(url.searchParams.get('timeMin')).toBe('2026-04-26T12:00:00.000Z')
    expect(url.searchParams.get('orderBy')).toBe('startTime')
    expect(url.searchParams.get('maxResults')).toBe('2500')
    expect(getGoogleCalendarSyncMode({})).toBe('full')
  })

  it('creates a Google watch channel payload for push notifications', () => {
    expect(buildGoogleCalendarWatchBody({
      channelId: 'channel-1',
      webhookUrl: 'https://flowspaced.com/api/google-calendar/webhook',
    })).toEqual({
      id: 'channel-1',
      type: 'web_hook',
      address: 'https://flowspaced.com/api/google-calendar/webhook',
    })
  })
})
