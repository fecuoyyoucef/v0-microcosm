"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Bell, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { NotificationItem } from "./notification-item"
import { GroupedNotificationItem } from "./grouped-notification-item"
import type { Notification } from "@/lib/types"
import Link from "next/link"
import { useSettings } from "@/components/settings-provider"
import { usePathname } from "next/navigation"

interface NotificationBellProps {
  userId: string
}

const translations = {
  ar: {
    notifications: "الإشعارات",
    noNotifications: "لا توجد إشعارات",
    markAllRead: "تحديد الكل كمقروء",
    viewAll: "عرض الكل",
    systemNotifications: "إشعارات النظام",
  },
  en: {
    notifications: "Notifications",
    noNotifications: "No notifications",
    markAllRead: "Mark all as read",
    viewAll: "View all",
    systemNotifications: "System Notifications",
  },
  fr: {
    notifications: "Notifications",
    noNotifications: "Pas de notifications",
    markAllRead: "Tout marquer comme lu",
    viewAll: "Voir tout",
    systemNotifications: "Notifications système",
  },
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const supabase = createClient()
  const { language } = useSettings()
  const t = translations[language]
  const pathname = usePathname()
  const activeCellIdRef = useRef<string | null>(null)

  // Extract active cell ID from pathname
  useEffect(() => {
    const match = pathname.match(/\/chat\/([a-f0-9-]+)/)
    activeCellIdRef.current = match ? match[1] : null
  }, [pathname])

  // Group notifications by cell
  const { groupedNotifications, systemNotifications } = useMemo(() => {
    const grouped: Record<string, { groupInfo: { name: string; avatar: string | null }; notifications: Notification[] }> = {}
    const system: Notification[] = []

    notifications.forEach((notif) => {
      if (!notif.group_id || notif.type === "system") {
        system.push(notif)
      } else {
        if (!grouped[notif.group_id]) {
          grouped[notif.group_id] = {
            groupInfo: {
              name: notif.group?.name || "Unknown",
              avatar: notif.group?.avatar_url || null,
            },
            notifications: [],
          }
        }
        grouped[notif.group_id].notifications.push(notif)
      }
    })

    // Sort each group's notifications by created_at descending
    Object.values(grouped).forEach((group) => {
      group.notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    })

    return { groupedNotifications: grouped, systemNotifications: system }
  }, [notifications])

  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("Error fetching notifications:", error)
      return
    }

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
    }
  }, [supabase, userId])

  useEffect(() => {
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
        async (payload) => {
          const newNotification = payload.new as Notification

          // Don't show notification if user is currently in that cell
          const isInActiveCell = activeCellIdRef.current && newNotification.group_id === activeCellIdRef.current
          
          // Fetch related data for the new notification
          let sender = null
          let group = null

          if (newNotification.sender_id) {
            const { data: senderData } = await supabase
              .from("profiles")
              .select("id, display_name, avatar_url")
              .eq("id", newNotification.sender_id)
              .single()
            sender = senderData
          }

          if (newNotification.group_id) {
            const { data: groupData } = await supabase
              .from("groups")
              .select("id, name, avatar_url")
              .eq("id", newNotification.group_id)
              .single()
            group = groupData
          }

          const enrichedNotification = { ...newNotification, sender, group }
          
          setNotifications((prev) => [enrichedNotification, ...prev])
          
          // Only increment unread count if not in the active cell
          if (!isInActiveCell) {
            setUnreadCount((prev) => prev + 1)
            // Show browser notification only if not in active cell
            showBrowserNotification(enrichedNotification)
          } else {
            // Auto-mark as read if in active cell
            markAsReadSilent(newNotification.id)
          }
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
          setNotifications((prev) => prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n)))
          if (updated.is_read) {
            setUnreadCount((prev) => Math.max(0, prev - 1))
          }
        },
      )
      .subscribe()

    // Request notification permission on mount
    requestNotificationPermission()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase, fetchNotifications])

  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission()
    }
  }

  const showBrowserNotification = (notification: Notification) => {
    if ("Notification" in window && Notification.permission === "granted") {
      const browserNotif = new Notification(notification.title || "Synaptic Space", {
        body: notification.body || "لديك إشعار جديد",
        icon: "/icons/icon-192x192.png",
        tag: notification.group_id || notification.id, // Group by cell
        requireInteraction: notification.data?.priority === "high",
        renotify: true, // Allow updating the same tag
      })

      browserNotif.onclick = () => {
        window.focus()
        const url = notification.data?.action_url || (notification.group_id ? `/chat/${notification.group_id}` : "/chat/notifications")
        window.location.href = url as string
        browserNotif.close()
      }
    }
  }

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId)
      
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const markAsReadSilent = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId)
  }

  const markMultipleAsRead = async (notificationIds: string[]) => {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", notificationIds)
      
    setNotifications((prev) => prev.map((n) => 
      notificationIds.includes(n.id) ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
    ))
    setUnreadCount((prev) => Math.max(0, prev - notificationIds.length))
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

  // Sort grouped notifications by latest message time
  const sortedGroupIds = useMemo(() => {
    return Object.entries(groupedNotifications)
      .filter(([, data]) => data.notifications.some((n) => !n.is_read))
      .sort((a, b) => {
        const aLatest = a[1].notifications[0]?.created_at || ""
        const bLatest = b[1].notifications[0]?.created_at || ""
        return new Date(bLatest).getTime() - new Date(aLatest).getTime()
      })
      .map(([groupId]) => groupId)
  }, [groupedNotifications])

  const unreadSystemNotifications = systemNotifications.filter((n) => !n.is_read)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">{t.notifications}</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs text-primary gap-1" onClick={markAllAsRead}>
              <CheckCheck className="h-3 w-3" />
              {t.markAllRead}
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[70vh]">
          {sortedGroupIds.length === 0 && unreadSystemNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Bell className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">{t.noNotifications}</p>
            </div>
          ) : (
            <div>
              {/* Grouped notifications by cell (Telegram-style) */}
              {sortedGroupIds.map((groupId) => {
                const data = groupedNotifications[groupId]
                return (
                  <GroupedNotificationItem
                    key={groupId}
                    groupId={groupId}
                    groupName={data.groupInfo.name}
                    groupAvatar={data.groupInfo.avatar}
                    notifications={data.notifications}
                    onReadAll={markMultipleAsRead}
                    onClick={() => setIsOpen(false)}
                  />
                )
              })}

              {/* System notifications */}
              {unreadSystemNotifications.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                    {t.systemNotifications}
                  </div>
                  <div className="divide-y divide-border/50">
                    {unreadSystemNotifications.slice(0, 5).map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onRead={markAsRead}
                        onClick={() => setIsOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              )}
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
