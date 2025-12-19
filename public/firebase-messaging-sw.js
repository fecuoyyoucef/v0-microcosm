importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js")

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

// معالجة الرسائل في background
messaging.onBackgroundMessage((payload) => {
  console.log("[FCM SW] Background message received:", payload)

  const title = payload.notification?.title || "Synaptic Space"
  const options = {
    body: payload.notification?.body || "لديك إشعار جديد",
    icon: payload.notification?.icon || "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    image: payload.notification?.image,
    data: payload.data,
    tag: payload.data?.type || "default",
    requireInteraction: payload.data?.priority === "high",
  }

  self.registration.showNotification(title, options)
})
