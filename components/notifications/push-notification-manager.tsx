"use client"

import { useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

interface PushNotificationManagerProps {
  userId: string
}

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
      console.log("[v0] Notifications denied")
      return false
    }

    const permission = await Notification.requestPermission()
    return permission === "granted"
  }, [])

  const saveSubscription = useCallback(
    async (subscription: PushSubscription) => {
      try {
        const { error } = await supabase.from("push_subscriptions").upsert(
          {
            user_id: userId,
            endpoint: subscription.endpoint,
            p256dh: subscription.toJSON().keys?.p256dh,
            auth: subscription.toJSON().keys?.auth,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,endpoint",
          },
        )

        if (error) {
          console.error("[v0] Error saving subscription:", error)
        } else {
          console.log("[v0] Push subscription saved")
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
          await saveSubscription(existingSubscription)
          return existingSubscription
        }

        // For demo purposes, we'll use a placeholder VAPID key
        // In production, you need to generate real VAPID keys
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

        if (!vapidPublicKey) {
          console.log("[v0] VAPID public key not configured, using browser notifications only")
          return null
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        })

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
      const hasPermission = await requestNotificationPermission()
      if (!hasPermission) return

      const registration = await registerServiceWorker()
      if (!registration) return

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready
      await subscribeToPush(registration)
    }

    initializePush()

    // Listen for messages from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "NOTIFICATION_CLICK") {
        // Navigate to the notification URL
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

  // This component doesn't render anything
  return null
}

// Helper function to convert VAPID key
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
