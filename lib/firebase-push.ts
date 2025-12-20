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

// تهيئة Firebase فقط على المتصفح
export async function initializeFirebase() {
  if (typeof window === "undefined") return null

  try {
    // التحقق من وجود المتغيرات
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.warn("[Firebase] Missing configuration")
      return null
    }

    // استيراد Firebase ديناميكياً
    const { initializeApp, getApps } = await import("firebase/app")
    const { getMessaging, isSupported } = await import("firebase/messaging")

    // التحقق من دعم المتصفح
    const supported = await isSupported()
    if (!supported) {
      console.warn("[Firebase] Messaging not supported in this browser")
      return null
    }

    // تهيئة Firebase App
    if (getApps().length === 0) {
      firebaseApp = initializeApp(firebaseConfig)
    } else {
      firebaseApp = getApps()[0]
    }

    // الحصول على Messaging instance
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

// تسجيل Service Worker والحصول على Token
export async function requestNotificationPermission(userId: string): Promise<string | null> {
  if (typeof window === "undefined") return null

  try {
    // طلب إذن الإشعارات
    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      console.log("[Firebase] Notification permission denied")
      return null
    }

    // تهيئة Firebase
    const messagingInstance = await initializeFirebase()
    if (!messagingInstance) return null

    // تسجيل Service Worker
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js")
    console.log("[Firebase] Service Worker registered")

    const vapidKey = await fetchVapidKey()
    if (!vapidKey) {
      console.error("[Firebase] VAPID key missing")
      return null
    }

    // الحصول على Token
    const { getToken } = await import("firebase/messaging")

    const token = await getToken(messagingInstance, {
      vapidKey,
      serviceWorkerRegistration: registration,
    })

    if (token) {
      console.log("[Firebase] FCM Token obtained")
      // حفظ Token في database
      await saveTokenToDatabase(userId, token)
      return token
    }

    return null
  } catch (error) {
    console.error("[Firebase] Error getting permission:", error)
    return null
  }
}

// حفظ Token في database
async function saveTokenToDatabase(userId: string, token: string) {
  try {
    const supabase = createClient()

    const { error } = await supabase.from("fcm_tokens").upsert(
      {
        user_id: userId,
        token: token,
        device_info: {
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
    console.log("[Firebase] Token saved to database for user:", userId)
  } catch (error) {
    console.error("[Firebase] Error saving token:", error)
  }
}

// الاستماع للإشعارات في foreground
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
