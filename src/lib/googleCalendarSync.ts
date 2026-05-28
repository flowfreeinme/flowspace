interface GoogleCalendarEventListOptions {
  syncToken?: string | null
  now?: Date
}

interface GoogleCalendarWatchOptions {
  channelId: string
  webhookUrl: string
}

export type GoogleCalendarSyncMode = 'full' | 'incremental'

const GOOGLE_CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

export function getGoogleCalendarSyncMode({ syncToken }: Pick<GoogleCalendarEventListOptions, 'syncToken'>): GoogleCalendarSyncMode {
  return syncToken ? 'incremental' : 'full'
}

export function buildGoogleCalendarEventListUrl({ syncToken, now = new Date() }: GoogleCalendarEventListOptions = {}) {
  const params = new URLSearchParams({
    maxResults: '2500',
    singleEvents: 'true',
    showDeleted: syncToken ? 'true' : 'false',
  })

  if (syncToken) {
    params.set('syncToken', syncToken)
  } else {
    const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    params.set('orderBy', 'startTime')
    params.set('timeMin', timeMin.toISOString())
  }

  return `${GOOGLE_CALENDAR_EVENTS_URL}?${params}`
}

export function buildGoogleCalendarWatchBody({ channelId, webhookUrl }: GoogleCalendarWatchOptions) {
  return {
    id: channelId,
    type: 'web_hook',
    address: webhookUrl,
  }
}
