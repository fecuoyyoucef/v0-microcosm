// Firebase Push Notifications - Client Side Only
// هذا الملف يعمل فقط على المتصفح

import { createClient } from "@/lib/supabase/client"

// Firebase config from environment variables (non-sensitive)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

let firebaseApp: any = null
let messaging: any = null

function getDeviceId(): string {
  if (typeof window === "undefined") return ""

  let deviceId = localStorage.getItem("fcm_device_id")
  if (!deviceId) {
    deviceId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${navigator.userAgent.length}`
    localStorage.setItem("fcm_device_id", deviceId)
  }
  return deviceId
}

export async function initializeFirebase() {
  if (typeof window === "undefined") return null

  try {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.warn("[Firebase] Missing configuration")
      return null
    }

    const { initializeApp, getApps } = await import("firebase/app")
    const { getMessaging, isSupported } = await import("firebase/messaging")

    const supported = await isSupported()
    if (!supported) {
      console.warn("[Firebase] Messaging not supported in this browser")
      return null
    }

    if (getApps().length === 0) {
      firebaseApp = initializeApp(firebaseConfig)
    } else {
      firebaseApp = getApps()[0]
    }

    messaging = getMessaging(firebaseApp)

    console.log("[Firebase] Initialized successfully")
    return messaging
  } catch (error) {
    console.error("[Firebase] Initialization error:", error)
    return null
  }
}

async function fetchVapidKey(): Promise<string | null> {
  try {
    const response = await fetch("/api/firebase/vapid-key")
    if (!response.ok) return null
    const data = await response.json()
    return data.vapidKey || null
  } catch (error) {
    console.error("[Firebase] Error fetching VAPID key:", error)
    return null
  }
}

export async function requestNotificationPermission(userId: string, forceRefresh = false): Promise<string | null> {
  if (typeof window === "undefined") return null

  try {
    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      console.log("[Firebase] Notification permission denied")
      return null
    }

    const messagingInstance = await initializeFirebase()
    if (!messagingInstance) return null

    if (forceRefresh) {
      console.log("[Firebase] Force refreshing token...")
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const reg of registrations) {
        if (reg.active?.scriptURL.includes("firebase-messaging-sw.js")) {
          console.log("[Firebase] Updating service worker...")
          await reg.update()
        }
      }
    }

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js")
    await navigator.serviceWorker.ready
    console.log("[Firebase] Service Worker registered and ready")

    const vapidKey = await fetchVapidKey()
    if (!vapidKey) {
      console.error("[Firebase] VAPID key missing")
      return null
    }

    const { getToken, deleteToken } = await import("firebase/messaging")

    if (forceRefresh) {
      try {
        await deleteToken(messagingInstance)
        console.log("[Firebase] Old token deleted for refresh")
      } catch (e) {
        // Token may not exist, ignore
      }
    }

    const token = await getToken(messagingInstance, {
      vapidKey,
      serviceWorkerRegistration: registration,
    })

    if (token) {
      console.log("[Firebase] FCM Token obtained:", token.substring(0, 30) + "...")
      await saveTokenToDatabase(userId, token)
      return token
    }

    return null
  } catch (error) {
    console.error("[Firebase] Error getting permission:", error)
    return null
  }
}

async function saveTokenToDatabase(userId: string, token: string) {
  try {
    const supabase = createClient()
    const deviceId = getDeviceId()

    // This ensures we only have one active token per user per device
    const { error: deleteError } = await supabase.from("fcm_tokens").delete().eq("user_id", userId).neq("token", token)

    if (deleteError) {
      console.warn("[Firebase] Error cleaning old tokens:", deleteError)
    } else {
      console.log("[Firebase] Cleaned old tokens for user:", userId)
    }

    // Now upsert the new token
    const { error } = await supabase.from("fcm_tokens").upsert(
      {
        user_id: userId,
        token: token,
        device_info: {
          device_id: deviceId,
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          timestamp: new Date().toISOString(),
        },
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "token",
      },
    )

    if (error) throw error
    console.log("[Firebase] Token saved - user:", userId, "device:", deviceId)
  } catch (error) {
    console.error("[Firebase] Error saving token:", error)
  }
}

export async function onForegroundMessage(callback: (payload: any) => void) {
  if (typeof window === "undefined") return

  try {
    const messagingInstance = await initializeFirebase()
    if (!messagingInstance) return

    const { onMessage } = await import("firebase/messaging")

    onMessage(messagingInstance, (payload) => {
      console.log("[Firebase] Foreground message received:", payload)
      callback(payload)
    })
  } catch (error) {
    console.error("[Firebase] Error setting up foreground listener:", error)
  }
}
