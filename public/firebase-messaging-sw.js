// Firebase Messaging Service Worker
// يعمل في الخلفية لاستقبال الإشعارات

importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js")

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDGnypzhn6NjY4g6LtQY3DBv05BfQgOcow",
  authDomain: "synaptic-space-ef0ae.firebaseapp.com",
  projectId: "synaptic-space-ef0ae",
  storageBucket: "synaptic-space-ef0ae.firebasestorage.app",
  messagingSenderId: "368632292580",
  appId: "1:368632292580:web:eb15c15a4f41dda0b4b8f1",
}

// Declare Firebase variable
const firebase = self.firebase

// Initialize Firebase
firebase.initializeApp(firebaseConfig)

// Get messaging instance
const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Background message received:", payload)

  const notificationTitle = payload.notification?.title || "إشعار جديد"
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    vibrate: [200, 100, 200],
    data: payload.data || {},
    requireInteraction: true,
    tag: payload.data?.tag || "default",
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event)

  event.notification.close()

  const url = event.notification.data?.url || "/"

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // Open new window if no existing window
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    }),
  )
})

console.log("[SW] Firebase Messaging Service Worker loaded")
