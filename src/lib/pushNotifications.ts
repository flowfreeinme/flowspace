const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  try {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4)
    const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
    const raw = window.atob(b64)
    const ab = new ArrayBuffer(raw.length)
    const view = new Uint8Array(ab)
    for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
    return view
  } catch {
    throw new Error('Invalid VAPID public key')
  }
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

  const sorted = [...events].sort((a, b) => {
    if (a.all_day === b.all_day) return 0
    return a.all_day ? -1 : 1
  })
  const shown = sorted.slice(0, 3)
  const rest = sorted.length - 3
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
  const response = await fetch('/api/push-subscribe', {
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

  if (!response.ok) {
    throw new Error(`Server failed to register push subscription: ${response.status}`)
  }

  return 'granted'
}

export async function unsubscribeFromPush(accessToken: string): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  if (!registration) return

  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return

  const endpoint = subscription.endpoint
  await subscription.unsubscribe()

  const response = await fetch('/api/push-unsubscribe', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ endpoint }),
  })

  if (!response.ok) {
    throw new Error(`Server failed to delete push subscription: ${response.status}`)
  }
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
  const response = await fetch('/api/push-subscribe', {
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

  if (!response.ok) {
    throw new Error(`Server failed to update push notification hour: ${response.status}`)
  }
}
