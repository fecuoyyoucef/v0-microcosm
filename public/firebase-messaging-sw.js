// Firebase Messaging Service Worker
// يعمل في الخلفية لاستقبال الإشعارات

importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js")

const firebase = self.firebase // Declare the firebase variable

let messaging = null
let isInitialized = false

// Initialize Firebase
async function initializeFirebase() {
  if (isInitialized) return

  try {
    console.log("[SW] Fetching Firebase config...")

    // جلب Firebase config من API
    const response = await fetch("/api/firebase/config")
    if (!response.ok) {
      throw new Error(`Failed to fetch config: ${response.status}`)
    }

    const config = await response.json()
    console.log("[SW] Firebase config loaded:", { projectId: config.projectId })

    // Initialize Firebase
    firebase.initializeApp(config)
    messaging = firebase.messaging()
    isInitialized = true

    console.log("[SW] Firebase initialized successfully")

    // Handle background messages
    messaging.onBackgroundMessage((payload) => {
      console.log("[SW] Background message received:", payload)

      const notificationTitle = payload.notification?.title || "إشعار جديد"
      const notificationBody = payload.notification?.body || ""
      const notificationType = payload.data?.type || "system"

      // Icon mapping for different notification types
      const iconMap = {
        new_message: "💬",
        mention: "@",
        reaction: "❤️",
        group_invite: "👥",
        group_join: "✅",
        decision_created: "🗳️",
        memory_generated: "🧠",
        system: "📢",
      }

      const notificationOptions = {
        body: `${iconMap[notificationType] || "🔔"} ${notificationBody}`,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-96x96.png",
        image: payload.data?.image || undefined,
        vibrate: [200, 100, 200],
        data: {
          url: payload.fcmOptions?.link || payload.data?.action_url || payload.data?.url || "/chat/notifications",
          type: notificationType,
          groupId: payload.data?.group_id,
          messageId: payload.data?.message_id,
          ...payload.data,
        },
        requireInteraction: payload.data?.priority === "high",
        tag: `notif-${notificationType}-${Date.now()}`,
        actions: [
          {
            action: "open",
            title: "فتح",
            icon: "/icons/icon-72x72.png",
          },
        ],
      }

      console.log("[SW] Showing notification:", notificationTitle, "with options:", notificationOptions)
      return self.registration.showNotification(notificationTitle, notificationOptions)
    })
  } catch (error) {
    console.error("[SW] Firebase initialization error:", error)
  }
}

// Initialize on activate
self.addEventListener("activate", (event) => {
  console.log("[SW] Service Worker activated")
  event.waitUntil(initializeFirebase())
})

// Initialize on install
self.addEventListener("install", (event) => {
  console.log("[SW] Service Worker installed")
  event.waitUntil(self.skipWaiting())
})

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.action)

  event.notification.close()

  // التعامل مع action buttons
  if (event.action === "open" || !event.action) {
    const url =
      event.notification.data?.action_url ||
      event.notification.data?.url ||
      (event.notification.data?.group_id ? `/chat/${event.notification.data.group_id}` : "/chat/notifications") ||
      "/"

    const fullUrl = url.startsWith("http") ? url : self.location.origin + url

    event.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin)) {
            client.navigate(fullUrl)
            return client.focus()
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(fullUrl)
        }
      }),
    )
  }
})

// Try to initialize immediately
initializeFirebase()

console.log("[SW] Firebase Messaging Service Worker loaded")
