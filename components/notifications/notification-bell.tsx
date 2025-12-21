"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { NotificationItem } from "./notification-item"
import type { Notification } from "@/lib/types"
import Link from "next/link"
import { useSettings } from "@/components/settings-provider"

interface NotificationBellProps {
  userId: string
}

const translations = {
  ar: {
    notifications: "الإشعارات",
    noNotifications: "لا توجد إشعارات",
    markAllRead: "تحديد الكل كمقروء",
    viewAll: "عرض الكل",
  },
  en: {
    notifications: "Notifications",
    noNotifications: "No notifications",
    markAllRead: "Mark all as read",
    viewAll: "View all",
  },
  fr: {
    notifications: "Notifications",
    noNotifications: "Pas de notifications",
    markAllRead: "Tout marquer comme lu",
    viewAll: "Voir tout",
  },
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const supabase = createClient()
  const { language } = useSettings()
  const t = translations[language]

  useEffect(() => {
    console.log("[v0] NotificationBell mounted for user:", userId)
    fetchNotifications()

    // Subscribe to realtime notifications
    const channel = supabase
      .channel(`notifications-bell-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("[v0] New notification received in bell:", payload.new)
          const newNotification = payload.new as Notification
          setNotifications((prev) => [newNotification, ...prev])
          setUnreadCount((prev) => prev + 1)

          // Show browser notification if permission granted
          showBrowserNotification(newNotification)
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("[v0] Notification updated:", payload.new)
          const updated = payload.new as Notification
          setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
          if (updated.is_read) {
            setUnreadCount((prev) => Math.max(0, prev - 1))
          }
        },
      )
      .subscribe((status) => {
        console.log("[v0] Bell realtime subscription status:", status)
      })

    // Request notification permission on mount
    requestNotificationPermission()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      const result = await Notification.requestPermission()
      console.log("[v0] Notification permission result:", result)
    }
  }

  const showBrowserNotification = (notification: Notification) => {
    console.log("[v0] Showing browser notification:", notification.title)
    if ("Notification" in window && Notification.permission === "granted") {
      const browserNotif = new Notification(notification.title || "Synaptic Space", {
        body: notification.body || "لديك إشعار جديد",
        icon: "/icons/icon-192x192.png",
        tag: notification.id,
        requireInteraction: notification.data?.priority === "high",
      })

      browserNotif.onclick = () => {
        window.focus()
        const url = notification.data?.action_url || "/chat/notifications"
        window.location.href = url
        browserNotif.close()
      }
    } else {
      console.log("[v0] Browser notification not shown - permission:", Notification.permission)
    }
  }

  const fetchNotifications = async () => {
    console.log("[v0] Fetching notifications for user:", userId)

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      console.error("[v0] Error fetching notifications:", error)
      return
    }

    console.log("[v0] Fetched notifications count:", data?.length || 0)

    if (data) {
      // Fetch related data separately to handle nulls
      const notificationsWithRelations = await Promise.all(
        data.map(async (notif) => {
          let sender = null
          let group = null

          if (notif.sender_id) {
            const { data: senderData } = await supabase
              .from("profiles")
              .select("id, display_name, avatar_url")
              .eq("id", notif.sender_id)
              .single()
            sender = senderData
          }

          if (notif.group_id) {
            const { data: groupData } = await supabase
              .from("groups")
              .select("id, name, avatar_url")
              .eq("id", notif.group_id)
              .single()
            group = groupData
          }

          return { ...notif, sender, group }
        }),
      )

      setNotifications(notificationsWithRelations)
      const unread = notificationsWithRelations.filter((n) => !n.is_read).length
      setUnreadCount(unread)
      console.log("[v0] Unread count:", unread)
    }
  }

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId)
  }

  const markAllAsRead = async () => {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("is_read", false)

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })))
    setUnreadCount(0)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">{t.notifications}</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={markAllAsRead}>
              {t.markAllRead}
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Bell className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">{t.noNotifications}</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.slice(0, 10).map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={markAsRead}
                  onClick={() => setIsOpen(false)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="p-2 border-t">
          <Link href="/chat/notifications" onClick={() => setIsOpen(false)}>
            <Button variant="ghost" className="w-full text-sm">
              {t.viewAll}
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
