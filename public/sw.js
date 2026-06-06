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
