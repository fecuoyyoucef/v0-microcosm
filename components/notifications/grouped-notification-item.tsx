"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import type { Notification } from "@/lib/types"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { ar, enUS, fr } from "date-fns/locale"
import { useSettings } from "@/components/settings-provider"
import {
  MessageSquare,
  AtSign,
  Heart,
  UserPlus,
  Users,
  UserMinus,
  Vote,
  CheckCircle,
  Brain,
  Bell,
  Megaphone,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface GroupedNotificationItemProps {
  groupName: string
  groupAvatar?: string | null
  groupId: string
  notifications: Notification[]
  onReadAll: (notificationIds: string[]) => void
  onClick?: () => void
}

const locales = { ar, en: enUS, fr }

const iconMap: Record<string, typeof Bell> = {
  new_message: MessageSquare,
  mention: AtSign,
  reaction: Heart,
  group_invite: UserPlus,
  group_join: Users,
  group_leave: UserMinus,
  decision_created: Vote,
  decision_closed: CheckCircle,
  memory_generated: Brain,
  system: Megaphone,
}

const colorMap: Record<string, string> = {
  new_message: "text-blue-500",
  mention: "text-purple-500",
  reaction: "text-pink-500",
  group_invite: "text-green-500",
  group_join: "text-emerald-500",
  group_leave: "text-orange-500",
  decision_created: "text-yellow-500",
  decision_closed: "text-teal-500",
  memory_generated: "text-cyan-500",
  system: "text-primary",
}

const translations = {
  ar: {
    showMore: "عرض المزيد",
    showLess: "عرض أقل",
    messages: "رسائل",
    message: "رسالة",
    unread: "غير مقروءة",
  },
  en: {
    showMore: "Show more",
    showLess: "Show less",
    messages: "messages",
    message: "message",
    unread: "unread",
  },
  fr: {
    showMore: "Voir plus",
    showLess: "Voir moins",
    messages: "messages",
    message: "message",
    unread: "non lu",
  },
}

export function GroupedNotificationItem({
  groupName,
  groupAvatar,
  groupId,
  notifications,
  onReadAll,
  onClick,
}: GroupedNotificationItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const router = useRouter()
  const { language } = useSettings()
  const t = translations[language]
  const locale = locales[language]

  // Show last 5 unread by default, all when expanded
  const unreadNotifications = notifications.filter((n) => !n.is_read)
  const displayedNotifications = isExpanded ? unreadNotifications : unreadNotifications.slice(0, 5)
  const hasMore = unreadNotifications.length > 5

  const handleGroupClick = () => {
    // Mark all as read
    const unreadIds = unreadNotifications.map((n) => n.id)
    if (unreadIds.length > 0) {
      onReadAll(unreadIds)
    }
    router.push(`/chat/${groupId}`)
    onClick?.()
  }

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  const latestNotification = unreadNotifications[0]
  const timeAgo = latestNotification
    ? formatDistanceToNow(new Date(latestNotification.created_at), {
        addSuffix: true,
        locale,
      })
    : ""

  if (unreadNotifications.length === 0) return null

  return (
    <div className="border-b border-border/50 bg-primary/5 hover:bg-primary/10 transition-colors">
      {/* Header - Cell info */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={handleGroupClick}
      >
        <div className="relative">
          <Avatar className="h-12 w-12 rounded-xl">
            <AvatarImage src={groupAvatar || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary font-bold rounded-xl">
              {groupName.substring(0, 2)}
            </AvatarFallback>
          </Avatar>
          {unreadNotifications.length > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold animate-pulse">
              {unreadNotifications.length > 99 ? "99+" : unreadNotifications.length}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-sm truncate">{groupName}</h3>
            <span className="text-xs text-muted-foreground shrink-0">{timeAgo}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {unreadNotifications.length} {unreadNotifications.length === 1 ? t.message : t.messages} {t.unread}
          </p>
        </div>
      </div>

      {/* Messages preview list */}
      <div className="px-3 pb-2 space-y-1">
        {displayedNotifications.map((notification) => {
          const Icon = iconMap[notification.type] || Bell
          return (
            <div
              key={notification.id}
              className="flex items-start gap-2 p-2 rounded-lg bg-background/60 hover:bg-background transition-colors cursor-pointer"
              onClick={() => {
                onReadAll([notification.id])
                if (notification.data?.action_url) {
                  router.push(notification.data.action_url as string)
                } else if (notification.message_id) {
                  router.push(`/chat/${groupId}?message=${notification.message_id}`)
                } else {
                  router.push(`/chat/${groupId}`)
                }
                onClick?.()
              }}
            >
              <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", colorMap[notification.type])} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1">{notification.title}</p>
                {notification.body && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notification.body}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {notification.sender && (
                    <div className="flex items-center gap-1">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={notification.sender.avatar_url || undefined} />
                        <AvatarFallback className="text-[8px]">
                          {notification.sender.display_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] text-muted-foreground">
                        {notification.sender.display_name}
                      </span>
                    </div>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale })}
                  </span>
                </div>
              </div>
              {!notification.is_read && (
                <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5 animate-pulse" />
              )}
            </div>
          )
        })}

        {/* Expand/Collapse button */}
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground hover:text-foreground gap-1 h-8"
            onClick={handleToggleExpand}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                {t.showLess}
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                {t.showMore} ({unreadNotifications.length - 5})
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
