interface GoogleCalendarAuthUrlOptions {
  clientId: string
  origin: string
  state: string
  flow?: 'token' | 'code'
}

export function buildGoogleCalendarAuthUrl({ clientId, origin, state, flow = 'token' }: GoogleCalendarAuthUrlOptions) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/oauth/google/callback.html`,
    response_type: flow,
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    include_granted_scopes: 'false',
    prompt: 'select_account consent',
    authuser: '-1',
    state,
  })

  if (flow === 'code') {
    params.set('access_type', 'offline')
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}
