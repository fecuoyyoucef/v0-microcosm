"use client"

import { useEffect, useState, useCallback } from "react"
import { requestNotificationPermission, onForegroundMessage } from "@/lib/firebase-push"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface FirebasePushProviderProps {
  userId: string
}

export function FirebasePushProvider({ userId }: FirebasePushProviderProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [permissionState, setPermissionState] = useState<NotificationPermission | null>(null)
  const [isRegistered, setIsRegistered] = useState(false)
  const router = useRouter()

  // التحقق من دعم المتصفح
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator) {
      setIsSupported(true)
      setPermissionState(Notification.permission)
    }
  }, [])

  // تسجيل المستخدم للإشعارات
  const registerForPush = useCallback(async () => {
    if (!isSupported || !userId) return

    try {
      const token = await requestNotificationPermission(userId)
      if (token) {
        setPermissionState("granted")
        console.log("[FirebasePush] Registration successful")
      }
    } catch (error) {
      console.error("[FirebasePush] Registration error:", error)
    }
  }, [isSupported, userId])

  useEffect(() => {
    if (isSupported && !isRegistered && permissionState !== "denied" && userId) {
      console.log("[FirebasePush] Auto-registering for push notifications...")
      registerForPush()
        .then(() => setIsRegistered(true))
        .catch((err) => console.error("[FirebasePush] Auto-registration failed:", err))
    }
  }, [isSupported, isRegistered, permissionState, userId, registerForPush])

  useEffect(() => {
    if (!isSupported || !userId) return

    const intervalId = setInterval(
      () => {
        if (permissionState === "granted") {
          console.log("[FirebasePush] Refreshing token...")
          registerForPush().catch((err) => console.error("[FirebasePush] Token refresh failed:", err))
        }
      },
      60 * 60 * 1000,
    ) // كل ساعة

    return () => clearInterval(intervalId)
  }, [isSupported, permissionState, userId, registerForPush])

  // الاستماع للإشعارات في foreground
  useEffect(() => {
    if (!isSupported || permissionState !== "granted") return

    onForegroundMessage((payload) => {
      const { notification, data, fcmOptions } = payload

      const notificationUrl = fcmOptions?.link || data?.action_url || data?.url || "/chat/notifications"

      // عرض toast للإشعار
      toast(notification?.title || "إشعار جديد", {
        description: notification?.body,
        duration: 5000,
        action: {
          label: "عرض",
          onClick: () => router.push(notificationUrl),
        },
      })

      console.log("[FirebasePush] Foreground notification received:", notification?.title)
    })
  }, [isSupported, permissionState, router])

  // هذا المكون لا يعرض شيئاً - يعمل في الخلفية
  return null
}
