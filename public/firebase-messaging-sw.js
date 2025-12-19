// Firebase Messaging Service Worker
// نظام جديد ومبسط

importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js")

// إعدادات Firebase
const firebase = self.firebase // Declare the firebase variable
firebase.initializeApp({
  apiKey: "AIzaSyDGnypzhn6NjY4g6LtQY3DBv05BfQgOcow",
  authDomain: "synaptic-space-ef0ae.firebaseapp.com",
  projectId: "synaptic-space-ef0ae",
  storageBucket: "synaptic-space-ef0ae.firebasestorage.app",
  messagingSenderId: "368632292580",
  appId: "1:368632292580:web:e93e7e61591753d7b4b8f1",
})

const messaging = firebase.messaging()

// معالجة الرسائل في الخلفية
messaging.onBackgroundMessage((payload) => {
  console.log("[Firebase SW] Background message:", payload)

  const title = payload.notification?.title || "Synaptic Space"
  const options = {
    body: payload.notification?.body || "لديك إشعار جديد",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    tag: `firebase-${Date.now()}`,
    data: {
      url: payload.data?.url || "/chat",
      ...payload.data,
    },
  }

  self.registration.showNotification(title, options)
})

// معالجة النقر على الإشعار
self.addEventListener("notificationclick", (event) => {
  console.log("[Firebase SW] Notification clicked")

  event.notification.close()

  const url = event.notification.data?.url || "/chat"

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // البحث عن نافذة مفتوحة
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus()
          client.postMessage({
            type: "NOTIFICATION_CLICK",
            url,
          })
          return
        }
      }
      // فتح نافذة جديدة
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    }),
  )
})

// إرسال رسائل للتطبيق الرئيسي
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})
