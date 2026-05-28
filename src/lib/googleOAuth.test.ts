import { describe, expect, it } from 'vitest'
import { buildGoogleCalendarAuthUrl } from './googleOAuth'

describe('buildGoogleCalendarAuthUrl', () => {
  it('forces a fresh account choice and consent for calendar import', () => {
    const url = new URL(buildGoogleCalendarAuthUrl({
      clientId: 'client-id',
      origin: 'https://flowspaced.com',
      state: 'state-1',
    }))

    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url.searchParams.get('client_id')).toBe('client-id')
    expect(url.searchParams.get('redirect_uri')).toBe('https://flowspaced.com/oauth/google/callback.html')
    expect(url.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/calendar.readonly')
    expect(url.searchParams.get('prompt')).toBe('select_account consent')
    expect(url.searchParams.get('include_granted_scopes')).toBe('false')
    expect(url.searchParams.get('authuser')).toBe('-1')
    expect(url.searchParams.get('state')).toBe('state-1')
  })

  it('requests an offline authorization code for direct background sync', () => {
    const url = new URL(buildGoogleCalendarAuthUrl({
      clientId: 'client-id',
      origin: 'https://flowspaced.com',
      state: 'state-2',
      flow: 'code',
    }))

    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('access_type')).toBe('offline')
    expect(url.searchParams.get('prompt')).toBe('select_account consent')
    expect(url.searchParams.get('state')).toBe('state-2')
  })
})
