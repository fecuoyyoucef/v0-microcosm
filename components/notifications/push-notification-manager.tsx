"use client"

import { useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

interface PushNotificationManagerProps {
  userId: string
}

const VAPID_PUBLIC_KEY = "BDj8yhVUy0-Ued2Dw4joucx73R8-0HOjAcL5XeUGwxvp_KPrp1uBeFxvmGVXN2pvCnKtR_MG5pSPv0wx3f_OKzs"

export function PushNotificationManager({ userId }: PushNotificationManagerProps) {
  const supabase = createClient()

  const registerServiceWorker = useCallback(async () => {
    if (!("serviceWorker" in navigator)) {
      console.log("[v0] Service Worker not supported")
      return null
    }

    try {
      const registration = await navigator.serviceWorker.register("/sw.js")
      console.log("[v0] Service Worker registered:", registration.scope)
      return registration
    } catch (error) {
      console.error("[v0] Service Worker registration failed:", error)
      return null
    }
  }, [])

  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      console.log("[v0] Notifications not supported")
      return false
    }

    if (Notification.permission === "granted") {
      return true
    }

    if (Notification.permission === "denied") {
      console.log("[v0] Notifications denied by user")
      return false
    }

    const permission = await Notification.requestPermission()
    console.log("[v0] Notification permission:", permission)
    return permission === "granted"
  }, [])

  const saveSubscription = useCallback(
    async (subscription: PushSubscription) => {
      try {
        const keys = subscription.toJSON().keys

        const { error } = await supabase.from("push_subscriptions").upsert(
          {
            user_id: userId,
            endpoint: subscription.endpoint,
            p256dh: keys?.p256dh || null,
            auth: keys?.auth || null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,endpoint",
          },
        )

        if (error) {
          console.error("[v0] Error saving subscription:", error)
        } else {
          console.log("[v0] Push subscription saved successfully")
        }
      } catch (error) {
        console.error("[v0] Error saving subscription:", error)
      }
    },
    [userId, supabase],
  )

  const subscribeToPush = useCallback(
    async (registration: ServiceWorkerRegistration) => {
      try {
        // Check if already subscribed
        const existingSubscription = await registration.pushManager.getSubscription()
        if (existingSubscription) {
          console.log("[v0] Using existing push subscription")
          await saveSubscription(existingSubscription)
          return existingSubscription
        }

        // Subscribe to push notifications
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })

        console.log("[v0] New push subscription created")
        await saveSubscription(subscription)
        return subscription
      } catch (error) {
        console.error("[v0] Push subscription failed:", error)
        return null
      }
    },
    [saveSubscription],
  )

  useEffect(() => {
    const initializePush = async () => {
      // Request permission first
      const hasPermission = await requestNotificationPermission()
      if (!hasPermission) {
        console.log("[v0] No notification permission, skipping push setup")
        return
      }

      // Register service worker
      const registration = await registerServiceWorker()
      if (!registration) {
        console.log("[v0] No service worker registration, skipping push setup")
        return
      }

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready
      console.log("[v0] Service worker ready, subscribing to push...")

      // Subscribe to push
      await subscribeToPush(registration)
    }

    initializePush()

    // Listen for messages from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "NOTIFICATION_CLICK") {
        if (event.data.url) {
          window.location.href = event.data.url
        }
      }
    }

    navigator.serviceWorker?.addEventListener("message", handleMessage)

    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleMessage)
    }
  }, [registerServiceWorker, requestNotificationPermission, subscribeToPush])

  return null
}

// Helper function to convert VAPID key from base64 to Uint8Array
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
