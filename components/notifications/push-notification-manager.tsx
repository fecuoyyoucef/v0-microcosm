"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface PushNotificationManagerProps {
  userId: string
}

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BDj8yhVUy0-Ued2Dw4joucx73R8-0HOjAcL5XeUGwxvp_KPrp1uBeFxvmGVXN2pvCnKtR_MG5pSPv0wx3f_OKzs"

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// No UI is rendered - it's purely for background functionality
export function PushNotificationManager({ userId }: PushNotificationManagerProps) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return
    }

    // Auto-subscribe if permission already granted
    if (Notification.permission === "granted") {
      autoSubscribe()
    }
  }, [])

  const autoSubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js")
      await navigator.serviceWorker.ready

      const existingSubscription = await registration.pushManager.getSubscription()
      if (existingSubscription) {
        setIsSubscribed(true)
        return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const subscriptionJson = subscription.toJSON()

      await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint: subscriptionJson.endpoint,
          p256dh: subscriptionJson.keys?.p256dh,
          auth: subscriptionJson.keys?.auth,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        },
      )

      setIsSubscribed(true)
    } catch (error) {
      console.error("Error auto-subscribing to push:", error)
    }
  }

  // Listen for new notifications via Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notif = payload.new as {
            id: string
            title: string
            body: string
            type: string
          }

          if (Notification.permission === "granted" && document.visibilityState === "visible") {
            const browserNotif = new Notification(notif.title || "Synaptic Space", {
              body: notif.body || "لديك إشعار جديد",
              icon: "/icons/icon-192x192.png",
              tag: `notif-${notif.id}`,
            })

            browserNotif.onclick = () => {
              window.focus()
              browserNotif.close()
            }
          }

          // Update app badge
          if ("setAppBadge" in navigator) {
            ;(navigator as Navigator & { setAppBadge: (count: number) => void }).setAppBadge(1)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase])

  return null
}
