"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, usePathname } from "next/navigation"

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
  const [isSubscribed, setIsSubscribed] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()
  const activeCellIdRef = useRef<string | null>(null)

  // Track which cell user is currently viewing
  useEffect(() => {
    const match = pathname.match(/\/chat\/([a-f0-9-]+)/)
    activeCellIdRef.current = match ? match[1] : null
  }, [pathname])

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("[Push] Push notifications not supported")
      return
    }

    if (Notification.permission === "granted") {
      autoSubscribe()
    }
  }, [])

  const autoSubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.ready

      const existingSubscription = await registration.pushManager.getSubscription()
      if (existingSubscription) {
        console.log("[Push] Already subscribed")
        setIsSubscribed(true)
        await saveSubscription(existingSubscription)
        return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      console.log("[Push] New subscription created")
      await saveSubscription(subscription)
      setIsSubscribed(true)
    } catch (error) {
      console.error("[Push] Error auto-subscribing:", error)
    }
  }

  const saveSubscription = async (subscription: PushSubscription) => {
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
        onConflict: "user_id,endpoint",
      },
    )
  }

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
          console.log("[Push] New notification received:", payload)

          const notif = payload.new as {
            id: string
            title: string
            body: string
            type: string
            group_id?: string
            message_id?: string
            data?: any
          }

          // Don't show notification if user is currently in that cell
          const isInActiveCell = activeCellIdRef.current && notif.group_id === activeCellIdRef.current

          if (isInActiveCell) {
            // Auto-mark as read since user is already in the cell
            supabase
              .from("notifications")
              .update({ is_read: true, read_at: new Date().toISOString() })
              .eq("id", notif.id)
              .then(() => updateBadgeCount())
            return
          }

          // Only show browser notification when the tab is hidden (backgrounded).
          // When visible, FCM / service-worker already delivered the push notification,
          // so showing another one here would duplicate it.
          if (Notification.permission === "granted" && document.visibilityState === "hidden") {
            const notification = new Notification(notif.title || "Synaptic Space", {
              body: notif.body || "لديك إشعار جديد",
              icon: "/icons/icon-192x192.png",
              tag: `notif-${notif.id}`,
              data: {
                url: notif.data?.action_url || (notif.group_id ? `/chat/${notif.group_id}` : "/chat/notifications"),
                notificationId: notif.id,
                type: notif.type,
              },
            })

            notification.onclick = () => {
              window.focus()
              if (notif.data?.action_url) {
                router.push(notif.data.action_url)
              } else if (notif.group_id) {
                router.push(`/chat/${notif.group_id}`)
              } else {
                router.push("/chat/notifications")
              }
              notification.close()
            }

            setTimeout(() => notification.close(), 10000)
          }

          updateBadgeCount()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase, router])

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    const handleMessage = (event: MessageEvent) => {
      console.log("[Push] Message from SW:", event.data)

      if (event.data && event.data.type === "NOTIFICATION_CLICK") {
        const { url, groupId, notificationId } = event.data

        if (notificationId) {
          supabase
            .from("notifications")
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq("id", notificationId)
            .then(() => {
              updateBadgeCount()
            })
        }

        if (url) {
          router.push(url)
        } else if (groupId) {
          router.push(`/chat/${groupId}`)
        }

        clearBadge()
      }
    }

    navigator.serviceWorker.addEventListener("message", handleMessage)

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage)
    }
  }, [router, supabase])

  const updateBadgeCount = async () => {
    try {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false)

      if ("setAppBadge" in navigator) {
        const badge = count || 0
        if (badge > 0) {
          ;(navigator as any).setAppBadge(badge)
        } else {
          ;(navigator as any).clearAppBadge()
        }
      }
    } catch (error) {
      console.error("[Push] Error updating badge:", error)
    }
  }

  const clearBadge = () => {
    if ("clearAppBadge" in navigator) {
      ;(navigator as any).clearAppBadge()
    }
  }

  useEffect(() => {
    updateBadgeCount()
  }, [])

  return null
}
