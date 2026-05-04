"use client"

import React from "react"

import { useEffect, useState, useCallback, useRef } from "react"
import { requestNotificationPermission, onForegroundMessage } from "@/lib/firebase-push"
import { toast } from "sonner"
import { useRouter, usePathname } from "next/navigation"

interface FirebasePushProviderProps {
  userId: string
  children: React.ReactNode
}

// FCM tokens are valid for months. Refresh at most once per 24h instead of every 30 min.
const TOKEN_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000
const TOKEN_REFRESH_KEY = "fcm_last_refresh_at"

export function FirebasePushProvider({ userId, children }: FirebasePushProviderProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [permissionState, setPermissionState] = useState<NotificationPermission | null>(null)
  const isRegisteredRef = useRef(false)
  const activeCellIdRef = useRef<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Track which cell user is currently viewing (used to suppress in-app toast)
  useEffect(() => {
    const match = pathname.match(/\/chat\/([a-f0-9-]+)/)
    activeCellIdRef.current = match ? match[1] : null
  }, [pathname])

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator) {
      setIsSupported(true)
      setPermissionState(Notification.permission)
    }
  }, [])

  const registerForPush = useCallback(
    async (forceRefresh = false) => {
      if (!isSupported || !userId) return

      try {
        const token = await requestNotificationPermission(userId, forceRefresh)
        if (token) {
          setPermissionState("granted")
          try {
            localStorage.setItem(TOKEN_REFRESH_KEY, String(Date.now()))
          } catch {
            // ignore storage errors (private mode etc.)
          }
        }
      } catch (error) {
        console.error("[FirebasePush] Registration error:", error)
      }
    },
    [isSupported, userId],
  )

  // One-time registration on mount when permission is already granted or default.
  // Uses force=false unless we've never registered before.
  useEffect(() => {
    if (!isSupported || isRegisteredRef.current || permissionState === "denied" || !userId) return

    isRegisteredRef.current = true
    let needsForce = false
    try {
      const last = localStorage.getItem(TOKEN_REFRESH_KEY)
      needsForce = !last
    } catch {
      needsForce = true
    }

    registerForPush(needsForce).catch((err) => console.error("[FirebasePush] Initial registration failed:", err))
  }, [isSupported, permissionState, userId, registerForPush])

  // Daily soft refresh (24h) — only when tab becomes visible and last refresh was long ago.
  // Removes the previous 30-min interval and the per-visibility refresh storm.
  useEffect(() => {
    if (!isSupported || !userId || permissionState !== "granted") return

    const maybeRefresh = () => {
      try {
        const last = parseInt(localStorage.getItem(TOKEN_REFRESH_KEY) || "0", 10)
        if (Date.now() - last < TOKEN_REFRESH_INTERVAL_MS) return
      } catch {
        // proceed with refresh on storage failure
      }
      registerForPush(false).catch((err) => console.error("[FirebasePush] Periodic refresh failed:", err))
    }

    const handleVisibility = () => {
      if (document.visibilityState === "visible") maybeRefresh()
    }

    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [isSupported, permissionState, userId, registerForPush])

  // Foreground push handler: show toast unless the user is in the relevant cell.
  // The Realtime subscription in NotificationBell handles the in-app badge/list,
  // so we only render a transient toast here for cross-page awareness.
  useEffect(() => {
    if (!isSupported || permissionState !== "granted") return

    onForegroundMessage((payload) => {
      const { notification, data, fcmOptions } = payload
      const notificationUrl = fcmOptions?.link || data?.action_url || data?.url || "/chat/notifications"

      const groupId = data?.group_id || data?.groupId
      if (groupId && activeCellIdRef.current === groupId) {
        // User is already in the cell — DB trigger will mark notification read,
        // and the bell's Realtime listener handles state. No toast needed.
        return
      }

      toast(notification?.title || "إشعار جديد", {
        description: notification?.body,
        duration: 5000,
        action: {
          label: "عرض",
          onClick: () => router.push(notificationUrl),
        },
      })
    })
  }, [isSupported, permissionState, router])

  return <>{children}</>
}
