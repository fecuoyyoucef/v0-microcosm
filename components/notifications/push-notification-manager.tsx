"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Bell, BellOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

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

export function PushNotificationManager({ userId }: PushNotificationManagerProps) {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | "unsupported">("default")
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPermissionStatus("unsupported")
      return
    }
    setPermissionStatus(Notification.permission)
    checkExistingSubscription()
  }, [])

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (error) {
      console.error("Error checking subscription:", error)
    }
  }

  const subscribeToPush = async () => {
    setIsSubscribing(true)

    try {
      const permission = await Notification.requestPermission()
      setPermissionStatus(permission)

      if (permission !== "granted") {
        setIsSubscribing(false)
        return
      }

      const registration = await navigator.serviceWorker.register("/sw.js")
      await navigator.serviceWorker.ready

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const subscriptionJson = subscription.toJSON()

      const { error } = await supabase.from("push_subscriptions").upsert(
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

      if (error) {
        console.error("Error saving subscription:", error)
        throw error
      }

      setIsSubscribed(true)

      new Notification("Synaptic Space", {
        body: "تم تفعيل الإشعارات بنجاح!",
        icon: "/icons/icon-192x192.png",
      })
    } catch (error) {
      console.error("Error subscribing to push:", error)
    } finally {
      setIsSubscribing(false)
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

  if (permissionStatus === "unsupported") {
    return null
  }

  // Show notification status only
  if (isSubscribed && permissionStatus === "granted") {
    return (
      <div className="flex items-center gap-1 text-xs text-green-500">
        <Bell className="h-4 w-4" />
      </div>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={subscribeToPush}
      disabled={isSubscribing}
      className="gap-1 text-xs text-muted-foreground p-2"
    >
      {isSubscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}
    </Button>
  )
}
