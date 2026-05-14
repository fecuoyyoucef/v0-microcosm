const CACHE_NAME = "synaptic-space-v4"
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

// Helper to get active cell ID from IndexedDB
async function getActiveCellId() {
  return new Promise((resolve) => {
    try {
      const dbRequest = indexedDB.open('synaptic-app', 1)
      dbRequest.onerror = () => resolve(null)
      dbRequest.onsuccess = (event) => {
        try {
          const db = event.target.result
          if (!db.objectStoreNames.contains('state')) {
            resolve(null)
            return
          }
          const tx = db.transaction('state', 'readonly')
          const store = tx.objectStore('state')
          const request = store.get('activeCellId')
          request.onsuccess = () => resolve(request.result || null)
          request.onerror = () => resolve(null)
        } catch (e) {
          resolve(null)
        }
      }
    } catch (e) {
      resolve(null)
    }
  })
}

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
  const groupId = data.groupId || data.group_id
  const senderName = data.senderName || ""
  const senderAvatar = data.senderAvatar || ""
  const cellAvatar = data.cellAvatar || ""
  
  // Build body with sender name
  let bodyContent = data.body || "لديك إشعار جديد"
  if (senderName && data.type === "new_message") {
    bodyContent = senderName + ":\n" + bodyContent
  }

  // Use cell avatar (the group/cell image) as the large icon; fall back to notification icon
  const iconUrl = cellAvatar || data.icon || "/icons/notification-icon.png"

  const options = {
    body: bodyContent,
    icon: iconUrl,
    // Badge = the SMALL status-bar icon (monochrome with transparency for Android)
    badge: "/notification-icon.png",
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
      groupId: groupId,
      messageId: data.messageId,
      type: data.type,
      ...data.data,
    },
    actions: data.actions || [
      { action: "open", title: "فتح" },
      { action: "reply", title: "رد سريع" },
      { action: "dismiss", title: "تجاهل" },
    ],
  }

  event.waitUntil(
    (async () => {
      // Check if user is currently viewing this cell - skip notification if so
      const activeCellId = await getActiveCellId()
      if (activeCellId && groupId && activeCellId === groupId) {
        console.log("[SW] Skipping notification - user is viewing this cell:", groupId)
        return
      }

      await self.registration.showNotification(title, options)
      if (self.registration.setAppBadge) {
        self.registration.setAppBadge(1)
      }
    })()
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
    return
  }

  // Clear any tray notifications belonging to a given cell.
  if (event.data && event.data.type === "clearCellNotifications") {
    const groupId = event.data.groupId
    if (!groupId) return
    event.waitUntil(
      (async () => {
        try {
          const tag = "notif-group-" + groupId
          const byTag = await self.registration.getNotifications({ tag })
          byTag.forEach((n) => n.close())
          const all = await self.registration.getNotifications()
          all.forEach((n) => {
            if (n.data && n.data.groupId === groupId) n.close()
          })
        } catch (err) {
          console.error("[SW] Failed to clear cell notifications:", err)
        }
      })(),
    )
  }
})
