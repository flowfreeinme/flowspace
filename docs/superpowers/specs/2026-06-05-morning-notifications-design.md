# Morning Notification — Design Spec
**Date:** 2026-06-05
**Status:** Approved

---

## Overview

A daily morning briefing delivered as an OS-level push notification showing the user's calendar events for the day. Fires at a user-configured time regardless of whether the Flowspace tab is open, using the Web Push API with a service worker.

---

## Architecture

Five components:

| Component | Location | Purpose |
|-----------|----------|---------|
| Service worker | `public/sw.js` | Receives push events, renders OS notification, handles click-to-open |
| Push client lib | `src/lib/pushNotifications.ts` | Register SW, subscribe to push, save/remove subscription via API |
| Subscribe endpoint | `api/push-subscribe.ts` | Save push subscription to Supabase |
| Unsubscribe endpoint | `api/push-unsubscribe.ts` | Remove push subscription from Supabase |
| Send endpoint + cron | `api/push-send.ts` + `vercel.json` cron (`0 * * * *`) | Hourly job: find subscribers whose notify_hour matches current hour in their timezone, fetch their events, send push |

**Dependency:** `web-push` npm package for VAPID signing and push delivery.

**VAPID keys:** Generated once, stored as `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` Vercel environment variables. `VAPID_PUBLIC_KEY` also exposed to the frontend via `VITE_VAPID_PUBLIC_KEY`.

---

## Data Model

New Supabase table: `push_subscriptions`

```sql
create table push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  endpoint      text not null,
  p256dh_key    text not null,
  auth_key      text not null,
  timezone      text not null default 'UTC',
  notify_hour   int  not null default 8,   -- 0–23 in user's local timezone
  created_at    timestamptz default now(),
  unique(user_id, endpoint)
);

alter table push_subscriptions enable row level security;
create policy "Users manage own subscriptions"
  on push_subscriptions for all
  using (auth.uid() = user_id);
```

`timezone` is auto-detected client-side via `Intl.DateTimeFormat().resolvedOptions().timeZone` — never manually entered by the user.

---

## Send Logic (`api/push-send.ts`)

Runs every hour via Vercel cron.

1. Query `push_subscriptions` for all rows
2. For each subscription, convert current UTC time to the user's `timezone` and check if `current_hour === notify_hour`
3. For matching subscribers, query `calendar_events` where `user_id = subscriber.user_id` and `start_time` falls within today (midnight–midnight in user's timezone), ordered by `start_time`
4. Build notification payload:
   - Title: `"Flowspace — Good morning"`
   - Body: up to 3 events listed by time + title; "+ N more" if additional; "No events today — your schedule is clear" if none
   - Data: `{ url: "/calendar" }`
5. Send push via `web-push.sendNotification(subscription, payload)`
6. On 410/404 response from push service: delete the subscription from Supabase (expired/revoked)

---

## Service Worker (`public/sw.js`)

```js
self.addEventListener('push', event => {
  const { title, body, data } = event.data.json()
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',  // create this asset if not present
      data,
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      const existing = list.find(c => c.url.includes('flowspace'))
      if (existing) return existing.focus()
      return clients.openWindow(event.notification.data?.url ?? '/')
    })
  )
})
```

On notification click: focuses an existing Flowspace tab if one is open, otherwise opens a new tab at `/calendar`.

---

## Settings UI

Location: existing `SettingsBox` component, new **Notifications** section.

```
Notifications

Morning briefing                    [ toggle ]

When enabled, delivers today's calendar
events as a system notification.

Deliver at         [ 8 ▼ ]  [ AM ▼ ]
```

- **Toggle on (first time):** calls `Notification.requestPermission()`. If granted, registers service worker and saves subscription. If denied, shows inline message: *"Allow notifications in your browser settings to use this feature."*
- **Toggle off:** calls unsubscribe endpoint, removes subscription from Supabase, unregisters push subscription in browser.
- **Time picker:** hour select (1–12) + AM/PM select. Changes save immediately with a short debounce (500ms) via PATCH to `api/push-subscribe`. Notification fires within the selected hour (e.g. selecting 8 AM delivers between 8:00–8:59 AM).
- **Timezone:** never shown to user, always auto-detected and sent with the subscription.

---

## Notification Content Format

```
🗓  Flowspace — Good morning
─────────────────────────────
Today · {Day} {Month} {Date}
• 9:00am  Standup
• 11:30am  Design review
• 2:00pm  1:1 with Sarah
+ 2 more events
```

- All-day events listed before timed events
- Timed events sorted by start time
- Max 3 events shown; remainder shown as "+ N more"
- If zero events: *"No events today — your schedule is clear"*

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Push subscription expired (410/404) | Auto-delete from Supabase; user re-enables in settings |
| Browser denies notification permission | Inline message in settings, toggle stays off |
| `api/push-send` fails for one user | Log error, continue sending to remaining users |
| User has no calendar events | Send notification with "clear schedule" message |
| VAPID keys missing from env | `api/push-send` returns 500, logs config error |

---

## Out of Scope

- Notification content includes todos (can be added later)
- Multiple notification times per day
- iOS Safari (limited Web Push support before iOS 16.4 / PWA install required)
- In-app notification history log
