self.addEventListener('push', event => {
  if (!event.data) return
  let title, body, data
  try {
    ;({ title, body, data } = event.data.json())
  } catch {
    return
  }
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
      const existing = list.find(c => new URL(c.url).origin === self.location.origin)
      if (existing) return existing.focus()
      return clients.openWindow(event.notification.data?.url ?? '/')
    })
  )
})
