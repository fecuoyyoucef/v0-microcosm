"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NotificationItemProps {
  notification: Notification
  onRead: (id: string) => void
  onClick?: () => void
  showFullDate?: boolean
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
  new_message: "text-blue-500 bg-blue-500/10",
  mention: "text-purple-500 bg-purple-500/10",
  reaction: "text-pink-500 bg-pink-500/10",
  group_invite: "text-green-500 bg-green-500/10",
  group_join: "text-emerald-500 bg-emerald-500/10",
  group_leave: "text-orange-500 bg-orange-500/10",
  decision_created: "text-yellow-500 bg-yellow-500/10",
  decision_closed: "text-teal-500 bg-teal-500/10",
  memory_generated: "text-cyan-500 bg-cyan-500/10",
  system: "text-primary bg-primary/10",
}

export function NotificationItem({ notification, onRead, onClick, showFullDate = false }: NotificationItemProps) {
  const router = useRouter()
  const { language } = useSettings()
  const Icon = iconMap[notification.type] || Bell
  const isSystemNotification = notification.type === "system"

  const handleClick = () => {
    if (!notification.is_read) {
      onRead(notification.id)
    }

    if (notification.data?.action_url) {
      router.push(notification.data.action_url)
      onClick?.()
      return
    }

    // Navigate based on notification type
    if (notification.group_id) {
      if (notification.message_id) {
        router.push(`/chat/${notification.group_id}?message=${notification.message_id}`)
      } else if (notification.type === "decision_created" || notification.type === "decision_closed") {
        router.push(`/chat/${notification.group_id}/decisions`)
      } else if (notification.type === "memory_generated") {
        router.push(`/chat/${notification.group_id}/memory`)
      } else {
        router.push(`/chat/${notification.group_id}`)
      }
    }

    onClick?.()
  }

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: locales[language],
  })

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 cursor-pointer transition-colors hover:bg-secondary/50",
        !notification.is_read && "bg-primary/5",
        isSystemNotification && !notification.is_read && "bg-primary/10 border-r-2 border-primary",
      )}
      onClick={handleClick}
    >
      <div className={cn("p-2 rounded-full", colorMap[notification.type] || "text-gray-500 bg-gray-500/10")}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn("text-sm line-clamp-1", !notification.is_read && "font-semibold")}>{notification.title}</p>
          {!notification.is_read && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 animate-pulse" />}
        </div>

        {notification.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notification.body}</p>}

        <div className="flex items-center gap-2 mt-1">
          {notification.sender ? (
            <Avatar className="h-4 w-4">
              <AvatarImage src={notification.sender.avatar_url || undefined} />
              <AvatarFallback className="text-[8px]">{notification.sender.display_name?.charAt(0)}</AvatarFallback>
            </Avatar>
          ) : isSystemNotification ? (
            <span className="text-[10px] text-primary font-medium">Synaptic Space</span>
          ) : null}
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
          {notification.data?.priority === "high" && (
            <span className="px-1.5 py-0.5 text-[10px] rounded bg-destructive/20 text-destructive font-medium">
              {language === "ar" ? "مهم" : language === "fr" ? "Important" : "Important"}
            </span>
          )}
        </div>

        {notification.data?.action_label && (
          <button className="mt-2 text-xs text-primary hover:underline">{notification.data.action_label}</button>
        )}
      </div>
    </div>
  )
}
