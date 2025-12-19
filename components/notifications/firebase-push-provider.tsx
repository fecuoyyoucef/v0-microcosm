"use client"

import { useEffect, useState, useCallback } from "react"
import { requestNotificationPermission, onForegroundMessage } from "@/lib/firebase-push"
import { toast } from "sonner"

interface FirebasePushProviderProps {
  userId: string
}

export function FirebasePushProvider({ userId }: FirebasePushProviderProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [permissionState, setPermissionState] = useState<NotificationPermission | null>(null)

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
      const { notification, data } = payload

      // عرض toast للإشعار
      toast(notification?.title || "إشعار جديد", {
        description: notification?.body,
        action: data?.url
          ? {
              label: "عرض",
              onClick: () => (window.location.href = data.url),
            }
          : undefined,
      })
    })
  }, [isSupported, permissionState])

  // هذا المكون لا يعرض شيئاً - يعمل في الخلفية
  return null
}
