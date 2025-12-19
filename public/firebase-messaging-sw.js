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

      const notificationTitle = payload.notification?.title || payload.data?.title || "إشعار جديد"
      const notificationBody = payload.notification?.body || payload.data?.body || ""

      const notificationOptions = {
        body: notificationBody,
        icon: "/icons/icon-192x192.png", // أيقونة كبيرة ملونة
        badge: "/icons/icon-96x96.png", // شارة صغيرة
        image: payload.data?.image || undefined, // صورة إضافية إن وجدت
        vibrate: [200, 100, 200],
        data: payload.data || {},
        requireInteraction: false, // السماح بإخفاء الإشعار تلقائياً
        tag: payload.data?.tag || `notification-${Date.now()}`,
        // إضافة actions للإشعارات
        actions: [
          {
            action: "open",
            title: "فتح",
            icon: "/icons/icon-72x72.png",
          },
        ],
      }

      console.log("[SW] Showing notification:", notificationTitle)
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
    const url = event.notification.data?.url || "/"
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
