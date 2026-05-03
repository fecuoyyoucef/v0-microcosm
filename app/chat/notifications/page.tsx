"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NotificationItem } from "@/components/notifications/notification-item"
import { GroupedNotificationItem } from "@/components/notifications/grouped-notification-item"
import type { Notification } from "@/lib/types"
import { ArrowRight, Bell, CheckCheck, Trash2, BellRing, Loader2 } from "lucide-react"
import { useSettings } from "@/components/settings-provider"
import Image from "next/image"

const translations = {
  ar: {
    notifications: "الإشعارات",
    all: "الكل",
    unread: "غير مقروءة",
    read: "مقروءة",
    grouped: "مجمّعة",
    markAllRead: "تحديد الكل كمقروء",
    deleteAll: "حذف الكل",
    noNotifications: "لا توجد إشعارات",
    noUnread: "لا توجد إشعارات غير مقروءة",
    noRead: "لا توجد إشعارات مقروءة",
    back: "رجوع",
    enableNotifications: "تفعيل الإشعارات",
    notificationsEnabled: "الإشعارات مفعّلة",
    notificationsBlocked: "الإشعارات محظورة",
    systemNotifications: "إشعارات النظام",
  },
  en: {
    notifications: "Notifications",
    all: "All",
    unread: "Unread",
    read: "Read",
    grouped: "Grouped",
    markAllRead: "Mark all as read",
    deleteAll: "Delete all",
    noNotifications: "No notifications",
    noUnread: "No unread notifications",
    noRead: "No read notifications",
    back: "Back",
    enableNotifications: "Enable Notifications",
    notificationsEnabled: "Notifications Enabled",
    notificationsBlocked: "Notifications Blocked",
    systemNotifications: "System Notifications",
  },
  fr: {
    notifications: "Notifications",
    all: "Tout",
    unread: "Non lues",
    read: "Lues",
    grouped: "Groupées",
    markAllRead: "Tout marquer comme lu",
    deleteAll: "Tout supprimer",
    noNotifications: "Pas de notifications",
    noUnread: "Pas de notifications non lues",
    noRead: "Pas de notifications lues",
    back: "Retour",
    enableNotifications: "Activer les notifications",
    notificationsEnabled: "Notifications activées",
    notificationsBlocked: "Notifications bloquées",
    systemNotifications: "Notifications système",
  },
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("grouped")
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default")
  const router = useRouter()
  const supabase = createClient()
  const { language } = useSettings()
  const t = translations[language]
  const isRTL = language === "ar"

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

  // Sort grouped notifications by latest message time
  const sortedGroupIds = useMemo(() => {
    return Object.entries(groupedNotifications)
      .sort((a, b) => {
        const aLatest = a[1].notifications[0]?.created_at || ""
        const bLatest = b[1].notifications[0]?.created_at || ""
        return new Date(bLatest).getTime() - new Date(aLatest).getTime()
      })
      .map(([groupId]) => groupId)
  }, [groupedNotifications])

  useEffect(() => {
    checkUser()

    if ("Notification" in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push("/auth/login")
      return
    }
    setUserId(user.id)
    await fetchNotifications(user.id)
    setLoading(false)
  }

  const fetchNotifications = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })

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
    }
  }, [supabase])

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
    }
  }

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId)

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)),
    )
  }

  const markMultipleAsRead = async (notificationIds: string[]) => {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", notificationIds)

    setNotifications((prev) =>
      prev.map((n) =>
        notificationIds.includes(n.id) ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      ),
    )
  }

  const markAllAsRead = async () => {
    if (!userId) return

    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("is_read", false)

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })))
  }

  const deleteAllRead = async () => {
    if (!userId) return

    await supabase.from("notifications").delete().eq("user_id", userId).eq("is_read", true)

    setNotifications((prev) => prev.filter((n) => !n.is_read))
  }

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "unread") return !n.is_read
    if (activeTab === "read") return n.is_read
    return true
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowRight className={`h-5 w-5 ${!isRTL && "rotate-180"}`} />
        </Button>
        <div className="flex items-center gap-2">
          <Image src="/icons/icon-72x72.png" alt="Synaptic Space" width={32} height={32} className="rounded-lg" />
          <h1 className="text-xl font-bold">{t.notifications}</h1>
        </div>
        {unreadCount > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
            {unreadCount}
          </span>
        )}
      </div>

      {notificationPermission !== "granted" && (
        <div className="p-3 bg-primary/10 border-b flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            <span className="text-sm">
              {notificationPermission === "denied" ? t.notificationsBlocked : t.enableNotifications}
            </span>
          </div>
          {notificationPermission === "default" && (
            <Button size="sm" onClick={requestNotificationPermission}>
              {t.enableNotifications}
            </Button>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 p-3 border-b">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-transparent"
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
        >
          <CheckCheck className="h-4 w-4" />
          {t.markAllRead}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-destructive hover:text-destructive bg-transparent"
          onClick={deleteAllRead}
          disabled={notifications.filter((n) => n.is_read).length === 0}
        >
          <Trash2 className="h-4 w-4" />
          {t.deleteAll}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="all"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            {t.all}
          </TabsTrigger>
          <TabsTrigger
            value="unread"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            {t.unread}
            {unreadCount > 0 && (
              <span className="mr-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="read"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            {t.read}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="flex-1 mt-0">
          <ScrollArea className="h-full">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
                <Bell className="h-16 w-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">
                  {activeTab === "all" ? t.noNotifications : activeTab === "unread" ? t.noUnread : t.noRead}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={markAsRead}
                    showFullDate
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
