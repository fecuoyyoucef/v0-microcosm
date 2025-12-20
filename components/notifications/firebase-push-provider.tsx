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

  // تسجيل تلقائي عند التحميل
  useEffect(() => {
    if (isSupported && permissionState !== "denied") {
      // تأخير قصير لضمان تحميل الصفحة
      const timer = setTimeout(() => {
        registerForPush()
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [isSupported, permissionState, registerForPush])

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
