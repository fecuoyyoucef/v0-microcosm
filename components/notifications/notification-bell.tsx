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
    fetchNotifications()

    // Subscribe to realtime notifications
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications((prev) => [newNotification, ...prev])
          setUnreadCount((prev) => prev + 1)
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
          const updated = payload.new as Notification
          setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
          if (updated.is_read) {
            setUnreadCount((prev) => Math.max(0, prev - 1))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select(`
        *,
        sender:profiles!sender_id(id, display_name, avatar_url),
        group:groups!group_id(id, name, avatar_url)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)

    if (!error && data) {
      setNotifications(data)
      setUnreadCount(data.filter((n) => !n.is_read).length)
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
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
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
