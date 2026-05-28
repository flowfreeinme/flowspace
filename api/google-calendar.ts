import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

export const config = {
  runtime: 'nodejs',
}

type GoogleCalendarDate = {
  date?: string
  dateTime?: string
}

type GoogleCalendarItem = {
  id?: string
  summary?: string
  location?: string
  status?: string
  start?: GoogleCalendarDate
  end?: GoogleCalendarDate
}

type GoogleTokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

type GoogleEventsResponse = {
  items?: GoogleCalendarItem[]
  nextSyncToken?: string
  error?: { message?: string }
}

type GoogleConnection = {
  user_id: string
  refresh_token: string
  access_token: string | null
  expires_at: string | null
  sync_token: string | null
  watch_channel_id: string | null
  watch_resource_id: string | null
  watch_expires_at: string | null
}

function googleDateToIso(date: GoogleCalendarDate | undefined) {
  const raw = date?.dateTime ?? date?.date
  if (!raw) return null
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function googleItemsToRows(items: GoogleCalendarItem[], userId: string) {
  return items.flatMap(item => {
    const startTime = googleDateToIso(item.start)
    if (!startTime) return []

    const endTime = googleDateToIso(item.end) ?? startTime
    return [{
      user_id: userId,
      ...(item.id ? { external_id: item.id } : {}),
      title: item.summary || 'Untitled',
      start_time: startTime,
      end_time: endTime,
      all_day: !!item.start?.date,
      ...(item.location ? { location: item.location } : {}),
      color: '#34a853',
      source: 'google',
    }]
  })
}

function buildGoogleCalendarEventListUrl(syncToken?: string | null) {
  const params = new URLSearchParams({
    maxResults: '2500',
    singleEvents: 'true',
    showDeleted: syncToken ? 'true' : 'false',
  })

  if (syncToken) {
    params.set('syncToken', syncToken)
  } else {
    const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    params.set('orderBy', 'startTime')
    params.set('timeMin', timeMin.toISOString())
  }

  return `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`
}

function buildGoogleCalendarWatchBody(channelId: string, webhookUrl: string) {
  return {
    id: channelId,
    type: 'web_hook',
    address: webhookUrl,
  }
}

function publicSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) throw new Error('Missing Supabase public environment variables.')

  return createClient(
    url,
    anonKey,
  )
}

function serviceSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('Missing Supabase URL for Google Calendar sync.')
  if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for Google Calendar sync.')
  return createClient(url, serviceKey)
}

function getOrigin(req: any) {
  const forwardedHost = req.headers['x-forwarded-host']
  const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost ?? req.headers.host
  const proto = req.headers['x-forwarded-proto'] ?? 'https'
  return `${proto}://${host}`
}

function googleClientId() {
  return process.env.GOOGLE_CLIENT_ID ?? process.env.VITE_GOOGLE_CLIENT_ID
}

function googleClientSecret() {
  return process.env.GOOGLE_CLIENT_SECRET
}

function getSetupProblems() {
  return [
    ['SUPABASE_URL or VITE_SUPABASE_URL', process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL],
    ['SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY],
    ['SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY],
    ['GOOGLE_CLIENT_ID or VITE_GOOGLE_CLIENT_ID', googleClientId()],
    ['GOOGLE_CLIENT_SECRET', googleClientSecret()],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name)
}

async function getUserId(req: any) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return null

  const { data: { user } } = await publicSupabase().auth.getUser(token)
  return user?.id ?? null
}

async function readJsonResponse(res: Response) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(res.ok ? 'Server returned an invalid response.' : text.slice(0, 160))
  }
}

async function exchangeCodeForTokens(code: string, origin: string) {
  const clientId = googleClientId()
  const clientSecret = googleClientSecret()
  if (!clientId || !clientSecret) throw new Error('Google Calendar is not configured for background sync.')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${origin}/oauth/google/callback.html`,
      grant_type: 'authorization_code',
    }),
  })
  const json = await readJsonResponse(res) as GoogleTokenResponse
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? 'Google Calendar could not be connected.')
  }
  return json
}

async function refreshAccessToken(refreshToken: string) {
  const clientId = googleClientId()
  const clientSecret = googleClientSecret()
  if (!clientId || !clientSecret) throw new Error('Google Calendar is not configured for background sync.')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })
  const json = await readJsonResponse(res) as GoogleTokenResponse
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? 'Google Calendar could not refresh its connection.')
  }
  return json
}

function tokenExpiry(expiresIn: number | undefined) {
  const seconds = Math.max((expiresIn ?? 3600) - 60, 60)
  return new Date(Date.now() + seconds * 1000).toISOString()
}

async function fetchGoogleEvents(accessToken: string, syncToken?: string | null) {
  const res = await fetch(buildGoogleCalendarEventListUrl(syncToken), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const json = await readJsonResponse(res) as GoogleEventsResponse

  if (res.status === 410 && syncToken) {
    return fetchGoogleEvents(accessToken, null)
  }

  if (!res.ok) {
    throw new Error(json?.error?.message ?? 'Google Calendar could not be synced.')
  }

  return {
    items: (json.items ?? []) as GoogleCalendarItem[],
    nextSyncToken: json.nextSyncToken ?? null,
  }
}

async function saveGoogleEvents(userId: string, items: GoogleCalendarItem[], mode: 'full' | 'incremental') {
  const supabase = serviceSupabase()

  if (mode === 'full') {
    const rows = googleItemsToRows(items.filter(item => item.status !== 'cancelled'), userId)
    const deleteResult = await supabase.from('calendar_events').delete().eq('user_id', userId).eq('source', 'google')
    if (deleteResult.error) throw new Error(deleteResult.error.message)

    if (rows.length > 0) {
      const insertResult = await supabase.from('calendar_events').insert(rows)
      if (insertResult.error) throw new Error(insertResult.error.message)
    }

    return rows
  }

  const cancelledIds = items
    .filter(item => item.status === 'cancelled' && item.id)
    .map(item => item.id as string)
  if (cancelledIds.length > 0) {
    const deleteResult = await supabase
      .from('calendar_events')
      .delete()
      .eq('user_id', userId)
      .eq('source', 'google')
      .in('external_id', cancelledIds)
    if (deleteResult.error) throw new Error(deleteResult.error.message)
  }

  const rows = googleItemsToRows(items.filter(item => item.status !== 'cancelled'), userId)
  if (rows.length > 0) {
    const upsertResult = await supabase
      .from('calendar_events')
      .upsert(rows, { onConflict: 'user_id,source,external_id' })
    if (upsertResult.error) throw new Error(upsertResult.error.message)
  }

  return rows
}

async function upsertConnection(userId: string, tokens: GoogleTokenResponse, syncToken: string | null) {
  const supabase = serviceSupabase()
  const { data: existing } = await supabase
    .from('google_calendar_connections')
    .select('refresh_token')
    .eq('user_id', userId)
    .maybeSingle()

  const refreshToken = tokens.refresh_token ?? existing?.refresh_token
  if (!refreshToken || !tokens.access_token) {
    throw new Error('Google did not return the refresh access needed for background sync. Reconnect and approve calendar access.')
  }

  const result = await supabase
    .from('google_calendar_connections')
    .upsert({
      user_id: userId,
      refresh_token: refreshToken,
      access_token: tokens.access_token,
      expires_at: tokenExpiry(tokens.expires_in),
      sync_token: syncToken,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (result.error) throw new Error(result.error.message)
}

async function getConnection(userId: string) {
  const { data, error } = await serviceSupabase()
    .from('google_calendar_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as GoogleConnection | null
}

async function ensureAccessToken(connection: GoogleConnection) {
  if (connection.access_token && connection.expires_at && new Date(connection.expires_at).getTime() > Date.now() + 60_000) {
    return connection.access_token
  }

  const tokens = await refreshAccessToken(connection.refresh_token)
  await upsertConnection(connection.user_id, tokens, connection.sync_token)
  return tokens.access_token as string
}

async function syncConnection(connection: GoogleConnection) {
  const accessToken = await ensureAccessToken(connection)
  const { items, nextSyncToken } = await fetchGoogleEvents(accessToken, connection.sync_token)
  const rows = await saveGoogleEvents(connection.user_id, items, connection.sync_token ? 'incremental' : 'full')

  const result = await serviceSupabase()
    .from('google_calendar_connections')
    .update({
      sync_token: nextSyncToken ?? connection.sync_token,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', connection.user_id)

  if (result.error) throw new Error(result.error.message)
  return rows
}

async function startWatch(connection: GoogleConnection, req: any) {
  const secret = process.env.GOOGLE_CALENDAR_WEBHOOK_SECRET
  if (!secret) return null

  const accessToken = await ensureAccessToken(connection)
  const channelId = `flowspace-${connection.user_id}-${randomUUID()}`
  const webhookUrl = `${getOrigin(req)}/api/google-calendar?action=webhook&secret=${encodeURIComponent(secret)}`
  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/watch', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildGoogleCalendarWatchBody(channelId, webhookUrl)),
  })
  const json = await readJsonResponse(res) as { resourceId?: string, expiration?: string, error?: { message?: string } }
  if (!res.ok) throw new Error(json?.error?.message ?? 'Google Calendar watch could not be started.')

  const update = await serviceSupabase()
    .from('google_calendar_connections')
    .update({
      watch_channel_id: channelId,
      watch_resource_id: json.resourceId ?? null,
      watch_expires_at: json.expiration ? new Date(Number(json.expiration)).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', connection.user_id)

  if (update.error) throw new Error(update.error.message)
  return { channelId, resourceId: json.resourceId ?? null }
}

async function handleConnect(req: any, res: any, userId: string) {
  const code = req.body?.authorizationCode
  if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Missing Google authorization code.' })

  const tokens = await exchangeCodeForTokens(code, getOrigin(req))
  const { items, nextSyncToken } = await fetchGoogleEvents(tokens.access_token as string)
  const rows = await saveGoogleEvents(userId, items, 'full')
  await upsertConnection(userId, tokens, nextSyncToken)

  let watch = null
  try {
    const connection = await getConnection(userId)
    if (connection) watch = await startWatch(connection, req)
  } catch (err) {
    console.warn('Google Calendar watch was not started:', err)
  }

  return res.json({ rows, connected: true, backgroundSync: Boolean(watch), watch })
}

async function handleSync(res: any, userId: string) {
  const connection = await getConnection(userId)
  if (!connection) return res.status(404).json({ error: 'Google Calendar is not connected yet.' })

  const rows = await syncConnection(connection)
  return res.json({ rows, connected: true })
}

async function handleDisconnect(res: any, userId: string) {
  const supabase = serviceSupabase()
  const deleteConnection = await supabase.from('google_calendar_connections').delete().eq('user_id', userId)
  if (deleteConnection.error) throw new Error(deleteConnection.error.message)

  const deleteEvents = await supabase.from('calendar_events').delete().eq('user_id', userId).eq('source', 'google')
  if (deleteEvents.error) throw new Error(deleteEvents.error.message)

  return res.json({ connected: false })
}

async function handleWebhook(req: any, res: any) {
  if (!process.env.GOOGLE_CALENDAR_WEBHOOK_SECRET || req.query?.secret !== process.env.GOOGLE_CALENDAR_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const channelId = req.headers['x-goog-channel-id']
  if (!channelId || Array.isArray(channelId)) return res.status(400).json({ error: 'Missing Google channel id.' })

  const { data, error } = await serviceSupabase()
    .from('google_calendar_connections')
    .select('*')
    .eq('watch_channel_id', channelId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (data) await syncConnection(data as GoogleConnection)

  return res.status(204).end()
}

async function handleCron(req: any, res: any) {
  if (process.env.CRON_SECRET && req.query?.secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data, error } = await serviceSupabase()
    .from('google_calendar_connections')
    .select('*')
    .order('last_synced_at', { ascending: true })
    .limit(25)

  if (error) throw new Error(error.message)

  let synced = 0
  for (const connection of (data ?? []) as GoogleConnection[]) {
    await syncConnection(connection)
    synced += 1
  }

  return res.json({ synced })
}

export default async function handler(req: any, res: any) {
  const action = req.query?.action ?? req.body?.action ?? 'connect'

  try {
    if (action === 'health') {
      const missing = getSetupProblems()
      return res.status(missing.length > 0 ? 503 : 200).json({
        ok: missing.length === 0,
        missing,
        webhookConfigured: Boolean(process.env.GOOGLE_CALENDAR_WEBHOOK_SECRET),
        cronConfigured: Boolean(process.env.CRON_SECRET),
      })
    }

    if (action === 'webhook') return handleWebhook(req, res)
    if (action === 'cron') return handleCron(req, res)

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const missing = getSetupProblems()
    if (missing.length > 0) {
      return res.status(503).json({
        error: `Google Calendar background sync is missing setup: ${missing.join(', ')}.`,
        missing,
      })
    }

    const userId = await getUserId(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    if (action === 'connect') return handleConnect(req, res, userId)
    if (action === 'sync') return handleSync(res, userId)
    if (action === 'disconnect') return handleDisconnect(res, userId)

    return res.status(400).json({ error: 'Unknown Google Calendar action.' })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? 'Google Calendar sync failed.' })
  }
}
