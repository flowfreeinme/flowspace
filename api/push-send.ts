import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export const config = { maxDuration: 60 }

function getLocalHour(timezone: string): number {
  const s = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  }).format(new Date())
  return parseInt(s, 10) % 24
}

function getLocalDateStr(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date())
}

function isEventOnDate(startTime: string, timezone: string, dateStr: string): boolean {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date(startTime)) === dateStr
}

function formatBody(
  events: Array<{ title: string; start_time: string; all_day: boolean }>,
  timezone: string,
): { title: string; body: string } {
  const title = 'Flowspace — Good morning'
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date())

  if (events.length === 0) {
    return { title, body: `${day}\nNo events today — your schedule is clear` }
  }

  const shown = events.slice(0, 3)
  const rest = events.length - 3
  const lines = shown.map(e => {
    if (e.all_day) return `• All day  ${e.title}`
    const time = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(e.start_time))
    return `• ${time}  ${e.title}`
  })
  if (rest > 0) lines.push(`+ ${rest} more event${rest > 1 ? 's' : ''}`)
  return { title, body: `${day}\n${lines.join('\n')}` }
}

export default async function handler(req: any, res: any) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.error('push-send: VAPID keys not configured')
    return res.status(500).json({ error: 'Push not configured' })
  }

  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL ?? 'admin@flowspaced.com'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )

  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh_key, auth_key, timezone, notify_hour')

  if (subsError) {
    console.error('push-send: failed to fetch subscriptions', subsError)
    return res.status(500).json({ error: 'DB error' })
  }

  const matching = (subs ?? []).filter(sub => getLocalHour(sub.timezone) === sub.notify_hour)

  const results = await Promise.allSettled(
    matching.map(async sub => {
      const localDate = getLocalDateStr(sub.timezone)
      const windowStart = new Date(`${localDate}T00:00:00Z`)
      windowStart.setDate(windowStart.getDate() - 1)
      const windowEnd = new Date(`${localDate}T00:00:00Z`)
      windowEnd.setDate(windowEnd.getDate() + 2)

      const { data: events } = await supabase
        .from('calendar_events')
        .select('title, start_time, all_day')
        .eq('user_id', sub.user_id)
        .gte('start_time', windowStart.toISOString())
        .lt('start_time', windowEnd.toISOString())
        .order('all_day', { ascending: false })
        .order('start_time', { ascending: true })

      const todayEvents = (events ?? []).filter(e =>
        isEventOnDate(e.start_time, sub.timezone, localDate),
      )

      const { title, body } = formatBody(todayEvents, sub.timezone)
      const payload = JSON.stringify({ title, body, data: { url: '/calendar' } })

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } },
          payload,
        )
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        } else {
          throw err
        }
      }
    }),
  )

  const failed = results.filter(r => r.status === 'rejected').length
  console.log(`push-send: sent=${results.length - failed} failed=${failed}`)
  return res.status(200).json({ sent: results.length - failed, failed })
}
