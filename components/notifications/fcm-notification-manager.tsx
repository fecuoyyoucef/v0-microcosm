"use client"

import { useEffect, useState } from "react"
import { requestFCMToken, onFCMMessage } from "@/lib/firebase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface FCMNotificationManagerProps {
  userId: string
}

export function FCMNotificationManager({ userId }: FCMNotificationManagerProps) {
  const router = useRouter()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (isInitialized || !userId) return

    initFCM()
  }, [userId, isInitialized])

  const initFCM = async () => {
    console.log("[v0] [FCM] Initializing Firebase Cloud Messaging...")

    if (!("Notification" in window)) {
      console.log("[v0] [FCM] Notifications not supported in this browser")
      return
    }

    if (!("serviceWorker" in navigator)) {
      console.log("[v0] [FCM] Service Worker not supported")
      return
    }

    try {
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js")
      console.log("[v0] [FCM] Service Worker registered:", registration.scope)

      await navigator.serviceWorker.ready
      console.log("[v0] [FCM] Service Worker is ready")

      // طلب الإذن إذا لم يتم منحه
      let permission = Notification.permission

      if (permission === "default") {
        console.log("[v0] [FCM] Requesting notification permission...")
        permission = await Notification.requestPermission()
      }

      console.log("[v0] [FCM] Notification permission:", permission)

      if (permission === "granted") {
        // الحصول على FCM token
        console.log("[v0] [FCM] Getting FCM token...")
        const token = await requestFCMToken()

        if (token) {
          console.log("[v0] [FCM] Token obtained, saving to database...")

          // حفظ token في database
          const response = await fetch("/api/push/subscribe-fcm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token,
              device_info: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
              },
            }),
          })

          if (response.ok) {
            console.log("[v0] [FCM] Token saved successfully!")
            toast.success("تم تفعيل الإشعارات الفورية بنجاح")
          } else {
            const error = await response.json()
            console.error("[v0] [FCM] Failed to save token:", error)
            toast.error("فشل حفظ إعدادات الإشعارات")
          }
        } else {
          console.error("[v0] [FCM] Failed to obtain token")
          toast.error("فشل الحصول على رمز الإشعارات")
        }

        // الاستماع للرسائل في foreground
        const unsubscribe = onFCMMessage((payload) => {
          console.log("[v0] [FCM] Foreground message received:", payload)

          const title = payload.notification?.title || "Synaptic Space"
          const body = payload.notification?.body || "لديك إشعار جديد"
          const url = payload.data?.url || "/chat"

          // عرض toast notification
          toast(title, {
            description: body,
            action: {
              label: "فتح",
              onClick: () => router.push(url),
            },
            duration: 5000,
          })
        })

        setIsInitialized(true)
        return () => unsubscribe()
      } else {
        console.log("[v0] [FCM] Permission denied by user")
        toast.error("تم رفض إذن الإشعارات")
      }
    } catch (error) {
      console.error("[v0] [FCM] Initialization error:", error)
      toast.error("حدث خطأ أثناء تفعيل الإشعارات")
    }
  }

  return null
}
