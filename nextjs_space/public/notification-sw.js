// Service Worker for Push Notifications
const CACHE_NAME = 'falclub-notifications-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

// Handle push events
self.addEventListener('push', (event) => {
  if (!event.data) return
  
  const data = event.data.json()
  const options = {
    body: data.body || data.message,
    icon: '/logo.png',
    badge: '/badge.png',
    tag: data.tag || 'falclub-notification',
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      notificationId: data.id
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'FalClub', options)
  )
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  const urlToOpen = event.notification.data?.url || '/'
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(urlToOpen)
          return
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, url, count } = event.data
    
    const options = {
      body: count > 1 ? `${body} (${count} yeni bildirim)` : body,
      icon: '/logo.png',
      badge: '/badge.png',
      tag: tag || 'falclub-notification',
      renotify: true,
      requireInteraction: false,
      vibrate: [200, 100, 200],
      silent: false,
      data: { url: url || '/' }
    }
    
    self.registration.showNotification(title, options)
  }
})
