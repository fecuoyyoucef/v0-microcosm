"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { getFCMToken, onFCMMessage } from "@/lib/firebase/fcm-client"
import { toast } from "sonner"

export function NewFCMManager() {
  const { user } = useUser()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (!user || isInitialized) return

    async function initializeFCM() {
      try {
        console.log("[FCM Manager] Initializing...")

        // Get VAPID key from server
        const configRes = await fetch("/api/firebase-config")
        const config = await configRes.json()

        if (!config.vapidKey) {
          console.error("[FCM Manager] No VAPID key")
          return
        }

        // Get FCM token
        const token = await getFCMToken(config.vapidKey)

        if (!token) {
          console.warn("[FCM Manager] Could not get FCM token")
          return
        }

        // Save token to database
        const saveRes = await fetch("/api/fcm/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            deviceInfo: {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
            },
          }),
        })

        if (!saveRes.ok) {
          throw new Error("Failed to save FCM token")
        }

        console.log("[FCM Manager] Token saved successfully")

        // Listen for foreground messages
        onFCMMessage((payload) => {
          const { notification, data } = payload

          toast(notification?.title || "إشعار جديد", {
            description: notification?.body,
            action: data?.url
              ? {
                  label: "فتح",
                  onClick: () => (window.location.href = data.url),
                }
              : undefined,
          })
        })

        setIsInitialized(true)
        console.log("[FCM Manager] Initialized successfully")
      } catch (error) {
        console.error("[FCM Manager] Error:", error)
      }
    }

    initializeFCM()
  }, [user, isInitialized])

  return null
}
