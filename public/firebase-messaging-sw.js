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
      showNotificationFromPayload(payload)
    })
  } catch (error) {
    console.error("[SW] Firebase initialization error:", error)
  }
}

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

// دالة لعرض الإشعار من payload مع تجميع الرسائل من نفس المجموعة
async function showNotificationFromPayload(payload) {
  const notificationTitle = payload.notification?.title || payload.data?.title || "إشعار جديد"
  const notificationBody = payload.notification?.body || payload.data?.body || ""
  const notificationType = payload.data?.type || "system"
  const groupId = payload.data?.group_id
  const senderName = payload.data?.senderName || ""
  const senderAvatar = payload.data?.senderAvatar || ""

  // Check if user is currently viewing this cell - skip notification if so
  const activeCellId = await getActiveCellId()
  if (activeCellId && groupId && activeCellId === groupId) {
    console.log("[SW] Skipping notification - user is viewing this cell:", groupId)
    return
  }

  // Use a stable tag per group so notifications replace (not stack)
  const stableTag = groupId
    ? "notif-group-" + groupId
    : payload.data?.tag || "notif-" + notificationType

  // Look for existing notification with the same tag to aggregate messages
  const existingNotifications = await self.registration.getNotifications({ tag: stableTag })
  let messages = []

  if (existingNotifications.length > 0) {
    // Get previous messages from the existing notification's data
    const existing = existingNotifications[0]
    messages = (existing.data && existing.data.messages) || []
  }

  // Add the new message with sender name
  const messageEntry = {
    senderName: senderName,
    senderAvatar: senderAvatar,
    body: notificationBody
  }
  messages.push(messageEntry)

  // Keep only the last 5 messages
  if (messages.length > 5) {
    messages = messages.slice(-5)
  }

  // Build the aggregated body with sender names
  const totalCount = messages.length
  let aggregatedBody
  if (totalCount === 1) {
    const msg = messages[0]
    aggregatedBody = (msg.senderName ? msg.senderName + ":\n" : "") + msg.body
  } else {
    aggregatedBody = messages.map(function(msg) {
      return (msg.senderName ? msg.senderName + ": " : "") + msg.body
    }).join("\n")
  }

  // Use sender avatar for single message, app icon for multiple
  const notificationIcon = (totalCount === 1 && senderAvatar) 
    ? senderAvatar 
    : "/icons/icon-192x192.png"

  const notificationOptions = {
    body: aggregatedBody,
    icon: notificationIcon,
    badge: "/icons/icon-96x96.png",
    image: payload.data?.image || undefined,
    vibrate: [200, 100, 200],
    data: {
      url: payload.fcmOptions?.link || payload.data?.action_url || payload.data?.url || "/chat/notifications",
      type: notificationType,
      groupId: groupId,
      messageId: payload.data?.message_id,
      messages: messages,
      ...payload.data,
    },
    requireInteraction: payload.data?.priority === "high",
    tag: stableTag,
    renotify: true,
    actions: [
      {
        action: "open",
        title: "فتح",
      },
    ],
  }

  console.log("[SW] Showing grouped notification:", notificationTitle, "messages:", totalCount)

  // Close existing notifications with same tag first (they'll be replaced)
  existingNotifications.forEach(function(n) { n.close() })

  return self.registration.showNotification(notificationTitle, notificationOptions)
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

// Handle push events
self.addEventListener("push", (event) => {
  if (!event.data) {
    console.log("[SW] Push received with no data")
    return
  }

  try {
    const payload = event.data.json()
    console.log("[SW] Push event received:", payload)

    // Handle data-only messages (no notification field) by using data fields
    if (payload.data && !payload.notification) {
      const dataPayload = {
        data: payload.data,
        notification: {
          title: payload.data.title || "إشعار جديد",
          body: payload.data.body || "",
        },
        fcmOptions: payload.fcmOptions,
      }
      event.waitUntil(showNotificationFromPayload(dataPayload))
    } else if (payload.notification || payload.data) {
      event.waitUntil(showNotificationFromPayload(payload))
    }
  } catch (error) {
    console.error("[SW] Error parsing push data:", error)
  }
})

// Try to initialize immediately
initializeFirebase()

console.log("[SW] Firebase Messaging Service Worker loaded")
