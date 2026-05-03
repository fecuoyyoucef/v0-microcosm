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

export function FirebasePushProvider({ userId, children }: FirebasePushProviderProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [permissionState, setPermissionState] = useState<NotificationPermission | null>(null)
  const isRegisteredRef = useRef(false)
  const activeCellIdRef = useRef<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Track which cell user is currently viewing
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
        console.log("[FirebasePush] Registering with forceRefresh:", forceRefresh)
        const token = await requestNotificationPermission(userId, forceRefresh)
        if (token) {
          setPermissionState("granted")
          console.log("[FirebasePush] Registration successful, token:", token.substring(0, 20) + "...")
        }
      } catch (error) {
        console.error("[FirebasePush] Registration error:", error)
      }
    },
    [isSupported, userId],
  )

  useEffect(() => {
    if (isSupported && !isRegisteredRef.current && permissionState !== "denied" && userId) {
      console.log("[FirebasePush] Initial registration with force refresh...")
      isRegisteredRef.current = true
      // Force refresh on first load to ensure fresh token
      registerForPush(true).catch((err) => console.error("[FirebasePush] Auto-registration failed:", err))
    }
  }, [isSupported, permissionState, userId, registerForPush])

  useEffect(() => {
    if (!isSupported || !userId) return

    const intervalId = setInterval(
      () => {
        if (permissionState === "granted") {
          console.log("[FirebasePush] Periodic token refresh...")
          registerForPush(false).catch((err) => console.error("[FirebasePush] Token refresh failed:", err))
        }
      },
      30 * 60 * 1000, // كل 30 دقيقة بدلاً من ساعة
    )

    return () => clearInterval(intervalId)
  }, [isSupported, permissionState, userId, registerForPush])

  useEffect(() => {
    if (!isSupported || !userId) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && permissionState === "granted") {
        console.log("[FirebasePush] Page visible, refreshing token...")
        registerForPush(false).catch((err) => console.error("[FirebasePush] Visibility refresh failed:", err))
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [isSupported, permissionState, userId, registerForPush])

  useEffect(() => {
    if (!isSupported || permissionState !== "granted") return

    onForegroundMessage((payload) => {
      const { notification, data, fcmOptions } = payload
      const notificationUrl = fcmOptions?.link || data?.action_url || data?.url || "/chat/notifications"
      
      // Don't show notification if user is currently in that cell
      const groupId = data?.group_id || data?.groupId
      if (groupId && activeCellIdRef.current === groupId) {
        console.log("[FirebasePush] Suppressing notification - user is in active cell:", groupId)
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

      console.log("[FirebasePush] Foreground notification:", notification?.title)
    })
  }, [isSupported, permissionState, router])

  return <>{children}</>
}
