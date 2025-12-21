const CACHE_NAME = "synaptic-space-v3"
const OFFLINE_URL = "/offline"

const STATIC_ASSETS = ["/", "/offline", "/icons/icon-192x192.png", "/icons/icon-512x512.png", "/icons/icon-72x72.png"]

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    }),
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => cacheName !== CACHE_NAME).map((cacheName) => caches.delete(cacheName)),
      )
    }),
  )
  self.clients.claim()
})

// Fetch event - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return
  if (!event.request.url.startsWith(self.location.origin)) return
  if (event.request.url.includes("/api/") || event.request.url.includes("supabase")) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone)
        })
        return response
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }
          if (event.request.mode === "navigate") {
            return caches.match(OFFLINE_URL)
          }
          return new Response("Offline", { status: 503 })
        })
      }),
  )
})

// Push notification event
self.addEventListener("push", (event) => {
  console.log("[SW] Push received:", event.data?.text())

  let data = {}
  try {
    data = event.data?.json() ?? {}
  } catch (e) {
    data = { title: "Synaptic Space", body: event.data?.text() || "لديك إشعار جديد" }
  }

  const title = data.title || "Synaptic Space"
  const options = {
    body: data.body || "لديك إشعار جديد",
    icon: data.icon || "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    image: data.image,
    vibrate: data.vibrate || [200, 100, 200],
    tag: data.tag || `notification-${Date.now()}`,
    renotify: true,
    requireInteraction: data.priority === "high" || data.requireInteraction === true,
    silent: data.silent === true,
    timestamp: data.timestamp || Date.now(),
    data: {
      url: data.url || data.action_url || "/chat",
      notificationId: data.id || data.notificationId,
      groupId: data.groupId,
      messageId: data.messageId,
      type: data.type,
      ...data.data,
    },
    actions: data.actions || [
      { action: "open", title: "فتح", icon: "/icons/icon-72x72.png" },
      { action: "reply", title: "رد سريع" },
      { action: "dismiss", title: "تجاهل" },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      if (self.registration.setAppBadge) {
        self.registration.setAppBadge(1)
      }
    }),
  )
})

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.action, event.notification.data)

  event.notification.close()

  if (self.registration.clearAppBadge) {
    self.registration.clearAppBadge()
  }

  if (event.action === "dismiss") {
    return
  }

  if (event.action === "reply") {
    const urlToOpen = event.notification.data?.url || "/chat"
    event.waitUntil(self.clients.openWindow(urlToOpen))
    return
  }

  const urlToOpen = event.notification.data?.url || "/chat"

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus().then(() => {
            client.postMessage({
              type: "NOTIFICATION_CLICK",
              url: urlToOpen,
              notificationId: event.notification.data?.notificationId,
              groupId: event.notification.data?.groupId,
              messageId: event.notification.data?.messageId,
            })
          })
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen)
      }
    }),
  )
})

// Notification close event to update badge
self.addEventListener("notificationclose", (event) => {
  console.log("[SW] Notification closed:", event.notification.tag)

  if (event.notification.data?.notificationId) {
    fetch("/api/notifications/track-dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notificationId: event.notification.data.notificationId,
        dismissed: true,
      }),
    }).catch((err) => console.log("[SW] Failed to track dismiss:", err))
  }
})

// Background sync for offline notifications
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-notifications") {
    event.waitUntil(syncNotifications())
  }
})

async function syncNotifications() {
  // This would sync any pending notification reads when back online
  console.log("[SW] Syncing notifications...")
}

// Message event for communication with main app
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})
