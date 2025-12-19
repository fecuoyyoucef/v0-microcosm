"use client"

import { useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface FirebasePushManagerProps {
  userId: string
}

// نظام Firebase Push Notifications جديد ومبسط
export function FirebasePushManager({ userId }: FirebasePushManagerProps) {
  const router = useRouter()
  const isInitialized = useRef(false)
  const retryCount = useRef(0)
  const maxRetries = 3

  const initializeFirebase = useCallback(async () => {
    // تجنب التهيئة المتكررة
    if (isInitialized.current) return
    if (typeof window === "undefined") return

    // التحقق من دعم المتصفح
    if (!("Notification" in window)) {
      console.log("[Firebase Push] Notifications not supported")
      return
    }

    if (!("serviceWorker" in navigator)) {
      console.log("[Firebase Push] Service Worker not supported")
      return
    }

    try {
      // تسجيل Service Worker الخاص بـ Firebase
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
        scope: "/",
      })
      console.log("[Firebase Push] Service Worker registered")

      // انتظار جاهزية Service Worker
      await navigator.serviceWorker.ready
      console.log("[Firebase Push] Service Worker ready")

      // طلب إذن الإشعارات
      let permission = Notification.permission
      if (permission === "default") {
        permission = await Notification.requestPermission()
      }

      if (permission !== "granted") {
        console.log("[Firebase Push] Permission denied")
        return
      }

      // الحصول على FCM Token
      const token = await getFCMToken(registration)
      if (!token) {
        throw new Error("Failed to get FCM token")
      }

      // حفظ Token في قاعدة البيانات
      const saved = await saveTokenToDatabase(token)
      if (saved) {
        console.log("[Firebase Push] Token saved successfully")
        isInitialized.current = true
      }

      // الاستماع للرسائل في foreground
      setupForegroundListener(router)
    } catch (error) {
      console.error("[Firebase Push] Initialization error:", error)

      // إعادة المحاولة
      if (retryCount.current < maxRetries) {
        retryCount.current++
        console.log(`[Firebase Push] Retrying... (${retryCount.current}/${maxRetries})`)
        setTimeout(initializeFirebase, 3000)
      }
    }
  }, [router])

  useEffect(() => {
    // تأخير بسيط لضمان تحميل الصفحة
    const timer = setTimeout(initializeFirebase, 2000)
    return () => clearTimeout(timer)
  }, [initializeFirebase])

  return null
}

// الحصول على FCM Token
async function getFCMToken(registration: ServiceWorkerRegistration): Promise<string | null> {
  try {
    // جلب VAPID key من السيرفر
    const configResponse = await fetch("/api/firebase/config")
    if (!configResponse.ok) {
      console.error("[Firebase Push] Failed to get config")
      return null
    }

    const { vapidKey, ...firebaseConfig } = await configResponse.json()
    if (!vapidKey) {
      console.error("[Firebase Push] VAPID key not configured")
      return null
    }

    // تهيئة Firebase ديناميكياً
    const { initializeApp, getApps } = await import("firebase/app")
    const { getMessaging, getToken } = await import("firebase/messaging")

    // تهيئة التطبيق إذا لم يكن موجوداً
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    const messaging = getMessaging(app)

    // الحصول على Token
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    })

    return token || null
  } catch (error) {
    console.error("[Firebase Push] Error getting token:", error)
    return null
  }
}

// حفظ Token في قاعدة البيانات
async function saveTokenToDatabase(token: string): Promise<boolean> {
  try {
    const response = await fetch("/api/firebase/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
        },
      }),
    })

    return response.ok
  } catch (error) {
    console.error("[Firebase Push] Error saving token:", error)
    return false
  }
}

// الاستماع للرسائل في foreground
function setupForegroundListener(router: ReturnType<typeof useRouter>) {
  if (typeof window === "undefined") return

  // الاستماع لرسائل من Service Worker
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "FCM_MESSAGE") {
      const { title, body, url } = event.data.payload

      toast(title || "Synaptic Space", {
        description: body || "لديك إشعار جديد",
        action: url
          ? {
              label: "فتح",
              onClick: () => router.push(url),
            }
          : undefined,
        duration: 5000,
      })
    }

    if (event.data?.type === "NOTIFICATION_CLICK") {
      const { url } = event.data
      if (url) {
        router.push(url)
      }
    }
  })
}
