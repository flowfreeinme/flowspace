# Morning Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a daily morning briefing as an OS push notification listing today's calendar events, firing at a user-configured hour even when the Flowspace tab is closed.

**Architecture:** A service worker registered in the browser receives Web Push payloads and shows OS notifications. A Vercel cron endpoint (`api/push-send.ts`) runs every hour, finds subscribers whose configured hour matches their local time, and sends pushes via the `web-push` npm library. Push subscriptions are stored in a new Supabase table. Users configure the feature in a new Notifications tab in Settings.

**Tech Stack:** Web Push API, service workers, `web-push` npm package, Supabase (new `push_subscriptions` table + service role key), Vercel cron, React/Zustand frontend

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `public/sw.js` | Service worker: receive push, show notification, handle click |
| Create | `src/lib/pushNotifications.ts` | Pure helpers + browser subscribe/unsubscribe/check functions |
| Create | `src/lib/pushNotifications.test.ts` | Unit tests for pure helpers |
| Create | `api/push-subscribe.ts` | Upsert push subscription into Supabase |
| Create | `api/push-unsubscribe.ts` | Delete push subscription from Supabase |
| Create | `api/push-send.ts` | Hourly cron: match subscribers by hour, fetch events, send pushes |
| Modify | `src/main.tsx` | Register service worker on app load |
| Modify | `src/components/SettingsBox.tsx` | Add Notifications tab with toggle + time picker |
| Modify | `vercel.json` | Add hourly cron + `worker-src 'self'` to CSP |

---

## Task 1: Install `web-push` and generate VAPID keys

**Files:** `package.json`

- [ ] **Step 1: Install web-push**

```bash
cd /Users/michael/flowspace && npm install web-push && npm install --save-dev @types/web-push
```

Expected: `web-push` appears in `dependencies`, `@types/web-push` in `devDependencies`.

- [ ] **Step 2: Generate VAPID key pair**

```bash
npx web-push generate-vapid-keys
```

Expected output (your values will differ):
```
Public Key:
BExamplePublicKeyBase64UrlEncoded...

Private Key:
ExamplePrivateKeyBase64UrlEncoded...
```

Copy both values — you'll use them in the next steps.

- [ ] **Step 3: Create/update `.env.local` with the keys**

Open `.env.local` (create it if it doesn't exist) and add:

```
VAPID_PUBLIC_KEY=<paste public key here>
VAPID_PRIVATE_KEY=<paste private key here>
VAPID_EMAIL=admin@flowspaced.com
VITE_VAPID_PUBLIC_KEY=<paste public key here — same value>
SUPABASE_SERVICE_ROLE_KEY=<paste from Supabase dashboard → Settings → API → service_role key>
```

`VITE_` prefix makes it available to the React frontend. The service role key is found at: Supabase dashboard → your project → Settings → API.

- [ ] **Step 4: Add env vars to Vercel**

```bash
cd /Users/michael/flowspace
vercel env add VAPID_PUBLIC_KEY production
vercel env add VAPID_PRIVATE_KEY production
vercel env add VAPID_EMAIL production
vercel env add VITE_VAPID_PUBLIC_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

Paste the same values when prompted.

- [ ] **Step 5: Commit package changes**

```bash
git add package.json package-lock.json
git commit -m "feat: add web-push dependency for push notifications"
```

---

## Task 2: Create Supabase `push_subscriptions` table

**Files:** Supabase (remote)

- [ ] **Step 1: Apply migration via Supabase MCP**

Use the Supabase MCP `apply_migration` tool with this SQL:

```sql
create table push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  endpoint      text not null,
  p256dh_key    text not null,
  auth_key      text not null,
  timezone      text not null default 'UTC',
  notify_hour   int  not null default 8,
  created_at    timestamptz default now(),
  unique(user_id, endpoint)
);

alter table push_subscriptions enable row level security;

create policy "Users manage own subscriptions"
  on push_subscriptions for all
  using (auth.uid() = user_id);
```

- [ ] **Step 2: Verify table exists**

Run via Supabase MCP `execute_sql`:

```sql
select column_name, data_type
from information_schema.columns
where table_name = 'push_subscriptions'
order by ordinal_position;
```

Expected: 8 rows listing `id`, `user_id`, `endpoint`, `p256dh_key`, `auth_key`, `timezone`, `notify_hour`, `created_at`.

---

## Task 3: Create the service worker

**Files:** Create `public/sw.js`

- [ ] **Step 1: Write the service worker file**

Create `/Users/michael/flowspace/public/sw.js`:

```js
self.addEventListener('push', event => {
  if (!event.data) return
  const { title, body, data } = event.data.json()
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data,
      badge: '/favicon.ico',
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin))
      if (existing) return existing.focus()
      return clients.openWindow(event.notification.data?.url ?? '/')
    })
  )
})
```

- [ ] **Step 2: Commit**

```bash
git add public/sw.js
git commit -m "feat: add service worker for push notifications"
```

---

## Task 4: Create push notification helpers with tests

**Files:** Create `src/lib/pushNotifications.ts`, create `src/lib/pushNotifications.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `/Users/michael/flowspace/src/lib/pushNotifications.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { buildNotifyHour, formatNotificationBody } from './pushNotifications'

describe('buildNotifyHour', () => {
  it('converts 12 AM to 0', () => {
    expect(buildNotifyHour(12, 'AM')).toBe(0)
  })
  it('converts 8 AM to 8', () => {
    expect(buildNotifyHour(8, 'AM')).toBe(8)
  })
  it('converts 12 PM to 12', () => {
    expect(buildNotifyHour(12, 'PM')).toBe(12)
  })
  it('converts 8 PM to 20', () => {
    expect(buildNotifyHour(8, 'PM')).toBe(20)
  })
  it('converts 1 PM to 13', () => {
    expect(buildNotifyHour(1, 'PM')).toBe(13)
  })
})

describe('formatNotificationBody', () => {
  const tz = 'UTC'

  it('returns clear-schedule message when no events', () => {
    const result = formatNotificationBody([], tz)
    expect(result.title).toBe('Flowspace — Good morning')
    expect(result.body).toContain('No events today')
  })

  it('lists up to 3 timed events', () => {
    const events = [
      { title: 'Standup', start_time: '2026-06-05T13:00:00Z', all_day: false },
      { title: 'Design review', start_time: '2026-06-05T15:30:00Z', all_day: false },
      { title: '1:1', start_time: '2026-06-05T18:00:00Z', all_day: false },
    ]
    const result = formatNotificationBody(events, tz)
    expect(result.body).toContain('Standup')
    expect(result.body).toContain('Design review')
    expect(result.body).toContain('1:1')
    expect(result.body).not.toContain('more event')
  })

  it('shows overflow count when more than 3 events', () => {
    const events = Array.from({ length: 5 }, (_, i) => ({
      title: `Event ${i + 1}`,
      start_time: `2026-06-05T${String(9 + i).padStart(2, '0')}:00:00Z`,
      all_day: false,
    }))
    const result = formatNotificationBody(events, tz)
    expect(result.body).toContain('+ 2 more events')
    expect(result.body).not.toContain('Event 4')
  })

  it('shows singular "event" when 1 overflow', () => {
    const events = Array.from({ length: 4 }, (_, i) => ({
      title: `Event ${i + 1}`,
      start_time: `2026-06-05T${String(9 + i).padStart(2, '0')}:00:00Z`,
      all_day: false,
    }))
    const result = formatNotificationBody(events, tz)
    expect(result.body).toContain('+ 1 more event')
  })

  it('puts all-day events before timed events', () => {
    const events = [
      { title: 'Timed', start_time: '2026-06-05T09:00:00Z', all_day: false },
      { title: 'All Day Holiday', start_time: '2026-06-05T00:00:00Z', all_day: true },
    ]
    const result = formatNotificationBody(events, tz)
    const allDayPos = result.body.indexOf('All Day Holiday')
    const timedPos = result.body.indexOf('Timed')
    expect(allDayPos).toBeLessThan(timedPos)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/michael/flowspace && npx vitest run src/lib/pushNotifications.test.ts
```

Expected: FAIL — `pushNotifications` module not found.

- [ ] **Step 3: Create `src/lib/pushNotifications.ts`**

```typescript
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(b64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export function buildNotifyHour(hour: number, ampm: 'AM' | 'PM'): number {
  if (ampm === 'AM') return hour === 12 ? 0 : hour
  return hour === 12 ? 12 : hour + 12
}

export function formatNotificationBody(
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

export async function subscribeToPush(
  accessToken: string,
  notifyHour: number,
): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })

  const sub = subscription.toJSON()
  await fetch('/api/push-subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      p256dh_key: sub.keys?.p256dh,
      auth_key: sub.keys?.auth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      notify_hour: notifyHour,
    }),
  })

  return 'granted'
}

export async function unsubscribeFromPush(accessToken: string): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  if (!registration) return

  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return

  const endpoint = subscription.endpoint
  await subscription.unsubscribe()

  await fetch('/api/push-unsubscribe', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ endpoint }),
  })
}

export async function isSubscribedToPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  if (!registration) return false
  const subscription = await registration.pushManager.getSubscription()
  return subscription !== null
}

export async function updatePushNotifyHour(
  accessToken: string,
  notifyHour: number,
): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  if (!registration) return

  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return

  const sub = subscription.toJSON()
  await fetch('/api/push-subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      p256dh_key: sub.keys?.p256dh,
      auth_key: sub.keys?.auth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      notify_hour: notifyHour,
    }),
  })
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/michael/flowspace && npx vitest run src/lib/pushNotifications.test.ts
```

Expected: All 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pushNotifications.ts src/lib/pushNotifications.test.ts
git commit -m "feat: add push notification helpers and tests"
```

---

## Task 5: Register service worker in `src/main.tsx`

**Files:** Modify `src/main.tsx`

- [ ] **Step 1: Read current main.tsx**

```bash
cat /Users/michael/flowspace/src/main.tsx
```

- [ ] **Step 2: Add service worker registration**

After the existing imports and before `ReactDOM.createRoot(...)`, add:

```typescript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed — push notifications unavailable
    })
  })
}
```

- [ ] **Step 3: Verify TypeScript still compiles**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/main.tsx
git commit -m "feat: register service worker for push notifications"
```

---

## Task 6: Create `api/push-subscribe.ts`

**Files:** Create `api/push-subscribe.ts`

- [ ] **Step 1: Create the endpoint**

Create `/Users/michael/flowspace/api/push-subscribe.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
    process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '',
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

  const { endpoint, p256dh_key, auth_key, timezone, notify_hour } = req.body ?? {}
  if (!endpoint || !p256dh_key || !auth_key) {
    return res.status(400).json({ error: 'Missing required fields: endpoint, p256dh_key, auth_key' })
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh_key,
      auth_key,
      timezone: typeof timezone === 'string' ? timezone : 'UTC',
      notify_hour: typeof notify_hour === 'number' ? notify_hour : 8,
    },
    { onConflict: 'user_id,endpoint' },
  )

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ ok: true })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add api/push-subscribe.ts
git commit -m "feat: add push-subscribe API endpoint"
```

---

## Task 7: Create `api/push-unsubscribe.ts`

**Files:** Create `api/push-unsubscribe.ts`

- [ ] **Step 1: Create the endpoint**

Create `/Users/michael/flowspace/api/push-unsubscribe.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
    process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '',
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

  const { endpoint } = req.body ?? {}
  if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' })

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ ok: true })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add api/push-unsubscribe.ts
git commit -m "feat: add push-unsubscribe API endpoint"
```

---

## Task 8: Create `api/push-send.ts` (cron handler)

**Files:** Create `api/push-send.ts`

- [ ] **Step 1: Create the cron endpoint**

Create `/Users/michael/flowspace/api/push-send.ts`:

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add api/push-send.ts
git commit -m "feat: add push-send cron endpoint"
```

---

## Task 9: Update `vercel.json`

**Files:** Modify `vercel.json`

- [ ] **Step 1: Read current vercel.json**

```bash
cat /Users/michael/flowspace/vercel.json
```

- [ ] **Step 2: Add cron entry and worker-src to CSP**

In `vercel.json`:
1. Add `{ "path": "/api/push-send", "schedule": "0 * * * *" }` to the `crons` array.
2. In the CSP header value, add `worker-src 'self';` before `frame-src`.

The updated `crons` array becomes:
```json
"crons": [
  { "path": "/api/google-calendar?action=cron", "schedule": "0 8 * * *" },
  { "path": "/api/push-send", "schedule": "0 * * * *" }
]
```

The updated CSP value (add `worker-src 'self'; ` before `frame-src 'none'`):
```
default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://accounts.google.com https://*.r2.cloudflarestorage.com https://api.open-meteo.com https://geocoding-api.open-meteo.com; worker-src 'self'; frame-src 'none'; object-src 'none';
```

- [ ] **Step 3: Verify JSON is valid**

```bash
node -e "require('./vercel.json'); console.log('valid')"
```

Expected: `valid`

- [ ] **Step 4: Commit**

```bash
git add vercel.json
git commit -m "feat: add push-send hourly cron and worker-src CSP"
```

---

## Task 10: Add Notifications tab to `SettingsBox`

**Files:** Modify `src/components/SettingsBox.tsx`

- [ ] **Step 1: Read the full SettingsBox file**

```bash
cat /Users/michael/flowspace/src/components/SettingsBox.tsx
```

- [ ] **Step 2: Add imports at the top of the file**

After the existing imports, add:

```typescript
import { useAuth } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import {
  buildNotifyHour,
  isSubscribedToPush,
  subscribeToPush,
  unsubscribeFromPush,
  updatePushNotifyHour,
} from '@/lib/pushNotifications'
```

- [ ] **Step 3: Add 'notifications' to the Tab type**

Change:
```typescript
type Tab = 'appearance' | 'layout' | 'shortcuts' | 'about'
```
To:
```typescript
type Tab = 'appearance' | 'layout' | 'shortcuts' | 'about' | 'notifications'
```

- [ ] **Step 4: Add notification state inside the component**

Inside the `SettingsBox` function, after the existing `useState` calls, add:

```typescript
const { session } = useAuth()
const [notifEnabled, setNotifEnabled] = useState(false)
const [notifPermissionDenied, setNotifPermissionDenied] = useState(false)
const [notifHour, setNotifHour] = useState(8)
const [notifAmpm, setNotifAmpm] = useState<'AM' | 'PM'>('AM')
const [notifLoading, setNotifLoading] = useState(false)
```

- [ ] **Step 5: Load subscription state when notifications tab opens**

Add a `useEffect` after the state declarations:

```typescript
useEffect(() => {
  if (tab !== 'notifications') return
  isSubscribedToPush().then(setNotifEnabled)
}, [tab])
```

- [ ] **Step 6: Add the Notifications tab button**

Find the tabs array (the one with `{ id: 'appearance', label: 'Appearance' }`) and add a notifications entry:

```typescript
{ id: 'notifications', label: 'Notifications' },
```

Add it after the `about` entry so the order is: Appearance, Layout, Shortcuts, Notifications, About.

- [ ] **Step 7: Add toggle and update handlers**

Add these functions inside the component, after the existing handler functions:

```typescript
async function handleNotifToggle() {
  if (!session?.access_token) return
  setNotifLoading(true)
  setNotifPermissionDenied(false)
  try {
    if (notifEnabled) {
      await unsubscribeFromPush(session.access_token)
      setNotifEnabled(false)
    } else {
      const result = await subscribeToPush(
        session.access_token,
        buildNotifyHour(notifHour, notifAmpm),
      )
      if (result === 'denied') {
        setNotifPermissionDenied(true)
      } else if (result === 'granted') {
        setNotifEnabled(true)
      }
    }
  } finally {
    setNotifLoading(false)
  }
}

async function handleNotifTimeChange(hour: number, ampm: 'AM' | 'PM') {
  setNotifHour(hour)
  setNotifAmpm(ampm)
  if (!notifEnabled || !session?.access_token) return
  await updatePushNotifyHour(session.access_token, buildNotifyHour(hour, ampm))
}
```

- [ ] **Step 8: Add the Notifications tab panel**

Find the block `{tab === 'about' && (` and add the notifications panel before it:

```tsx
{tab === 'notifications' && (
  <div className="space-y-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-200">Morning briefing</p>
        <p className="text-xs text-gray-500 mt-0.5">Today's calendar events as a system notification</p>
      </div>
      <button
        onClick={handleNotifToggle}
        disabled={notifLoading}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${notifEnabled ? 'bg-violet-600' : 'bg-gray-600'} ${notifLoading ? 'opacity-50' : ''}`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${notifEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </div>

    {notifPermissionDenied && (
      <p className="text-xs text-amber-400">
        Allow notifications in your browser settings to use this feature.
      </p>
    )}

    {notifEnabled && (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Deliver at</span>
        <select
          value={notifHour}
          onChange={e => handleNotifTimeChange(Number(e.target.value), notifAmpm)}
          className="bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded px-2 py-1 focus:outline-none"
        >
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <select
          value={notifAmpm}
          onChange={e => handleNotifTimeChange(notifHour, e.target.value as 'AM' | 'PM')}
          className="bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded px-2 py-1 focus:outline-none"
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 9: Run the full test suite**

```bash
cd /Users/michael/flowspace && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 10: Verify TypeScript compiles**

```bash
cd /Users/michael/flowspace && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add src/components/SettingsBox.tsx
git commit -m "feat: add Notifications settings tab for morning push briefing"
```

---

## Task 11: Deploy and smoke test

- [ ] **Step 1: Deploy to production**

```bash
cd /Users/michael/flowspace && vercel --prod --yes --scope mgordon04g-2640s-projects
```

- [ ] **Step 2: Open the deployed app and verify service worker registers**

Open the production URL in Chrome. Open DevTools → Application → Service Workers. Confirm `sw.js` appears as "activated and running".

- [ ] **Step 3: Verify the Settings Notifications tab appears**

Open Settings (gear icon) → confirm a "Notifications" tab appears. Click it — confirm toggle and time picker render.

- [ ] **Step 4: Enable notifications and verify browser prompts for permission**

Click the toggle. Browser should show a permission prompt. Grant it. Confirm the toggle turns on and the time picker appears.

- [ ] **Step 5: Smoke test the push-send endpoint**

```bash
curl -X POST https://flowspaced.com/api/push-send
```

Expected response: `{"sent":0,"failed":0}` (no subscribers yet at this test hour) or similar JSON — importantly not a 500 error.

- [ ] **Step 6: Final commit if any fixes were needed**

```bash
git add -A && git commit -m "fix: post-deploy notification fixes"
```

---

## Self-Review Notes

- **Spec coverage:** All 5 spec components covered. Data model matches spec exactly. Error handling table (410/404 cleanup, permission denied, VAPID missing) covered in Tasks 6, 7, 8, 10.
- **Type consistency:** `buildNotifyHour(hour, ampm)` used consistently across `pushNotifications.ts` and `SettingsBox`. `formatNotificationBody` / `formatBody` are intentionally separate (frontend vs API, avoiding cross-module imports).
- **Env vars needed before Task 8 works:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`, `SUPABASE_SERVICE_ROLE_KEY` — documented in Task 1.
