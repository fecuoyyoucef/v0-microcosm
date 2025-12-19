"use client"

import { useEffect } from "react"
import { requestFCMToken, onFCMMessage } from "@/lib/firebase/client"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface FCMNotificationManagerProps {
  userId: string
}

export function FCMNotificationManager({ userId }: FCMNotificationManagerProps) {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    initFCM()
  }, [])

  const initFCM = async () => {
    if (!("Notification" in window)) {
      console.log("[FCM] Notifications not supported")
      return
    }

    // طلب الإذن إذا لم يتم منحه
    if (Notification.permission === "default") {
      const result = await Notification.requestPermission()
      if (result !== "granted") {
        console.log("[FCM] Permission denied")
        return
      }
    }

    if (Notification.permission === "granted") {
      // الحصول على FCM token
      const token = await requestFCMToken()
      if (token) {
        // حفظ token في database
        await fetch("/api/push/subscribe-fcm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, platform: "web" }),
        })
      }

      // الاستماع للرسائل في foreground
      const unsubscribe = onFCMMessage((payload) => {
        console.log("[FCM] Foreground message:", payload)

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

      return () => unsubscribe()
    }
  }

  return null
}
