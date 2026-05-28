import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { CalendarEvent } from '@/types/calendar'
import { supabase } from '@/lib/supabase'

interface CalendarStore {
  events: CalendarEvent[]
  googleConnected: boolean
  loadEvents: (userId: string) => Promise<void>
  createEvent: (event: Omit<CalendarEvent, 'id'>, userId: string) => Promise<void>
  updateEvent: (id: string, changes: Partial<CalendarEvent>, userId: string) => Promise<void>
  removeEvent: (id: string, userId: string) => Promise<void>
  importICS: (text: string, userId: string) => Promise<void>
  connectGoogle: (authorizationCode: string, userId: string) => Promise<void>
  syncGoogle: (userId: string) => Promise<void>
  disconnectGoogle: (userId: string) => Promise<void>
  clearAll: (userId: string) => Promise<void>
}

const googleConnectionKey = (userId: string) => `flowspace_google_calendar_connected_${userId}`

function markGoogleConnected(userId: string, connected: boolean) {
  if (typeof localStorage === 'undefined') return
  if (connected) localStorage.setItem(googleConnectionKey(userId), '1')
  else localStorage.removeItem(googleConnectionKey(userId))
}

function hasGoogleConnection(userId: string) {
  return typeof localStorage !== 'undefined' && localStorage.getItem(googleConnectionKey(userId)) === '1'
}

function assertSupabaseOk(error: unknown, fallback: string) {
  if (!error) return
  const message = error instanceof Error ? error.message : fallback
  throw new Error(message)
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

function rowToEvent(r: Record<string, unknown>): CalendarEvent {
  return {
    id: r.id as string,
    title: r.title as string,
    start: new Date(r.start_time as string),
    end: new Date(r.end_time as string),
    allDay: r.all_day as boolean,
    location: typeof r.location === 'string' ? r.location : undefined,
    color: r.color as string,
    source: r.source as 'google' | 'ics',
  }
}

export const useCalendar = create<CalendarStore>((set, get) => ({
  events: [],
  googleConnected: false,

  async loadEvents(userId) {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: true })
    assertSupabaseOk(error, 'Could not load calendar events.')
    if (data) {
      set({
        events: data.map(rowToEvent),
        googleConnected: data.some(r => r.source === 'google') || hasGoogleConnection(userId),
      })
    }
  },

  async createEvent(event, userId) {
    const id = uuid()
    const { data, error } = await supabase.from('calendar_events').insert({
      id,
      user_id: userId,
      title: event.title,
      start_time: event.start.toISOString(),
      end_time: event.end.toISOString(),
      all_day: event.allDay,
      location: event.location ?? null,
      color: event.color ?? '#7c6af7',
      source: 'ics',
    }).select().single()
    assertSupabaseOk(error, 'Could not create calendar event.')
    if (data) set(s => ({ events: [...s.events, rowToEvent(data)].sort((a, b) => a.start.getTime() - b.start.getTime()) }))
  },

  async updateEvent(id, changes, userId) {
    const existing = get().events.find(e => e.id === id)
    if (!existing) return
    const updated = { ...existing, ...changes }
    const { error } = await supabase.from('calendar_events').update({
      title: updated.title,
      start_time: updated.start.toISOString(),
      end_time: updated.end.toISOString(),
      all_day: updated.allDay,
      location: updated.location ?? null,
      color: updated.color,
    }).eq('id', id).eq('user_id', userId)
    assertSupabaseOk(error, 'Could not update calendar event.')
    set(s => ({ events: s.events.map(e => e.id === id ? updated : e) }))
  },

  async removeEvent(id, userId) {
    const { error } = await supabase.from('calendar_events').delete().eq('id', id).eq('user_id', userId)
    assertSupabaseOk(error, 'Could not remove calendar event.')
    set(s => ({ events: s.events.filter(e => e.id !== id) }))
  },

  async importICS(text, userId) {
    const ICAL = (await import('ical.js')).default
    const jcal = ICAL.parse(text)
    const comp = new ICAL.Component(jcal)
    const vevents: InstanceType<typeof ICAL.Component>[] = comp.getAllSubcomponents('vevent')
    const rows = vevents.map(ve => {
      const ev = new ICAL.Event(ve)
      const start = ev.startDate.toJSDate()
      const end = ev.endDate?.toJSDate() ?? start
      const location = ev.component.getFirstPropertyValue('location') as string | null
      return { user_id: userId, title: ev.summary || 'Untitled', start_time: start.toISOString(), end_time: end.toISOString(), all_day: ev.startDate.isDate, location: location || null, color: '#7c6af7', source: 'ics' }
    })
    if (rows.length === 0) return
    const { error } = await supabase.from('calendar_events').insert(rows)
    assertSupabaseOk(error, 'Could not import calendar events.')
    await get().loadEvents(userId)
  },

  async connectGoogle(authorizationCode, userId) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Sign in again before syncing Google Calendar.')

    const res = await fetch('/api/google-calendar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action: 'connect', authorizationCode }),
    })
    const json = await readJsonResponse(res)
    if (!res.ok) {
      const message = typeof json?.error === 'string'
        ? json.error
        : json?.error?.message ?? 'Google Calendar could not be synced.'
      throw new Error(message)
    }

    markGoogleConnected(userId, true)
    await get().loadEvents(userId)
    set({ googleConnected: true })
  },

  async syncGoogle(userId) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Sign in again before syncing Google Calendar.')

    const res = await fetch('/api/google-calendar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action: 'sync' }),
    })
    const json = await readJsonResponse(res)
    if (!res.ok) {
      const message = typeof json?.error === 'string'
        ? json.error
        : json?.error?.message ?? 'Google Calendar could not be synced.'
      throw new Error(message)
    }

    markGoogleConnected(userId, true)
    await get().loadEvents(userId)
    set({ googleConnected: true })
  },

  async disconnectGoogle(userId) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Sign in again before disconnecting Google Calendar.')

    const res = await fetch('/api/google-calendar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action: 'disconnect' }),
    })
    const json = await readJsonResponse(res)
    if (!res.ok) {
      const message = typeof json?.error === 'string'
        ? json.error
        : json?.error?.message ?? 'Google Calendar could not be disconnected.'
      throw new Error(message)
    }

    markGoogleConnected(userId, false)
    await get().loadEvents(userId)
    set({ googleConnected: false })
  },

  async clearAll(userId) {
    const { error } = await supabase.from('calendar_events').delete().eq('user_id', userId)
    assertSupabaseOk(error, 'Could not clear calendar events.')
    markGoogleConnected(userId, false)
    set({ events: [], googleConnected: false })
  },
}))
