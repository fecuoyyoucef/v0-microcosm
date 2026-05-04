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

interface EnrichedRow {
  id: string
  user_id: string
  type: Notification["type"]
  title: string
  body: string | null
  data: Record<string, unknown> | null
  is_read: boolean
  read_at: string | null
  created_at: string
  group_id: string | null
  sender_id: string | null
  message_id: string | null
  sender_display_name: string | null
  sender_avatar_url: string | null
  group_name: string | null
  group_avatar_url: string | null
}

function rowToNotification(row: EnrichedRow): Notification {
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    data: (row.data as Record<string, unknown>) ?? {},
    group_id: row.group_id,
    sender_id: row.sender_id,
    message_id: row.message_id,
    is_read: row.is_read,
    read_at: row.read_at,
    created_at: row.created_at,
    sender: row.sender_id
      ? {
          id: row.sender_id,
          display_name: row.sender_display_name ?? "",
          avatar_url: row.sender_avatar_url,
          username: null,
          bio: null,
          created_at: "",
          updated_at: "",
        }
      : null,
    group: row.group_id
      ? ({
          id: row.group_id,
          name: row.group_name ?? "Unknown",
          avatar_url: row.group_avatar_url,
        } as Notification["group"])
      : null,
  }
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
    const grouped: Record<
      string,
      { groupInfo: { name: string; avatar: string | null }; notifications: Notification[] }
    > = {}
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

    Object.values(grouped).forEach((group) => {
      group.notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    })

    return { groupedNotifications: grouped, systemNotifications: system }
  }, [notifications])

  // Single query against the enriched view (no N+1)
  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from("notifications_enriched")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("[Bell] Error fetching notifications:", error)
      return
    }

    if (data) {
      const mapped = (data as EnrichedRow[]).map(rowToNotification)
      setNotifications(mapped)
      setUnreadCount(mapped.filter((n) => !n.is_read).length)
    }
  }, [supabase, userId])

  // Fetch a single enriched row by id (used for realtime INSERT enrichment)
  const fetchEnrichedById = useCallback(
    async (id: string): Promise<Notification | null> => {
      const { data, error } = await supabase.from("notifications_enriched").select("*").eq("id", id).single()
      if (error || !data) return null
      return rowToNotification(data as EnrichedRow)
    },
    [supabase],
  )

  useEffect(() => {
    fetchNotifications()

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
          const raw = payload.new as Notification
          const isInActiveCell = activeCellIdRef.current && raw.group_id === activeCellIdRef.current

          // Auto-mark as read if user is already in that cell
          if (isInActiveCell) {
            await supabase
              .from("notifications")
              .update({ is_read: true, read_at: new Date().toISOString() })
              .eq("id", raw.id)
            return
          }

          const enriched = await fetchEnrichedById(raw.id)
          if (!enriched) return

          setNotifications((prev) => {
            if (prev.some((n) => n.id === enriched.id)) return prev
            return [enriched, ...prev].slice(0, 50)
          })
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
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n)),
          )
          if (updated.is_read) {
            setUnreadCount((prev) => Math.max(0, prev - 1))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase, fetchNotifications, fetchEnrichedById])

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId)

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)),
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const markMultipleAsRead = async (notificationIds: string[]) => {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", notificationIds)

    setNotifications((prev) =>
      prev.map((n) =>
        notificationIds.includes(n.id) ? { ...n, is_read: true, read_at: new Date().toISOString() } : n,
      ),
    )
    setUnreadCount((prev) => Math.max(0, prev - notificationIds.length))
  }

  const markAllAsRead = async () => {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("is_read", false)

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })),
    )
    setUnreadCount(0)
  }

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
        <Button
          variant="ghost"
          size="icon"
          aria-label={t.notifications}
          className="relative text-foreground hover:text-foreground hover:bg-accent"
        >
          <Bell className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-semibold leading-none ring-2 ring-background">
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
