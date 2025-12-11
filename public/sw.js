const CACHE_NAME = "synaptic-space-v1"
const OFFLINE_URL = "/offline"

const STATIC_ASSETS = ["/", "/offline", "/icons/icon-192x192.png", "/icons/icon-512x512.png"]

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
  // Skip non-GET requests
  if (event.request.method !== "GET") return

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return

  // Skip API routes and Supabase requests
  if (event.request.url.includes("/api/") || event.request.url.includes("supabase")) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response before caching
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
          // Return offline page for navigation requests
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
  const data = event.data?.json() ?? {}
  const title = data.title || "Synaptic Space"
  const options = {
    body: data.body || "لديك رسالة جديدة",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/chat",
    },
    actions: [
      { action: "open", title: "فتح" },
      { action: "close", title: "إغلاق" },
    ],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Notification click event
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  if (event.action === "close") return

  const urlToOpen = event.notification.data?.url || "/chat"

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen)
      }
    }),
  )
})
