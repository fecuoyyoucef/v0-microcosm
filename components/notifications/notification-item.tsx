"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Notification } from "@/lib/types"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { ar, enUS, fr } from "date-fns/locale"
import { useSettings } from "@/components/settings-provider"
import { MessageSquare, AtSign, Heart, UserPlus, Users, UserMinus, Vote, CheckCircle, Brain, Bell } from "lucide-react"
import { cn } from "@/lib/utils"

interface NotificationItemProps {
  notification: Notification
  onRead: (id: string) => void
  onClick?: () => void
  showFullDate?: boolean
}

const locales = { ar, en: enUS, fr }

const iconMap = {
  new_message: MessageSquare,
  mention: AtSign,
  reaction: Heart,
  group_invite: UserPlus,
  group_join: Users,
  group_leave: UserMinus,
  decision_created: Vote,
  decision_closed: CheckCircle,
  memory_generated: Brain,
  system: Bell,
}

const colorMap = {
  new_message: "text-blue-500 bg-blue-500/10",
  mention: "text-purple-500 bg-purple-500/10",
  reaction: "text-pink-500 bg-pink-500/10",
  group_invite: "text-green-500 bg-green-500/10",
  group_join: "text-emerald-500 bg-emerald-500/10",
  group_leave: "text-orange-500 bg-orange-500/10",
  decision_created: "text-yellow-500 bg-yellow-500/10",
  decision_closed: "text-teal-500 bg-teal-500/10",
  memory_generated: "text-cyan-500 bg-cyan-500/10",
  system: "text-gray-500 bg-gray-500/10",
}

export function NotificationItem({ notification, onRead, onClick, showFullDate = false }: NotificationItemProps) {
  const router = useRouter()
  const { language } = useSettings()
  const Icon = iconMap[notification.type] || Bell

  const handleClick = () => {
    if (!notification.is_read) {
      onRead(notification.id)
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
      )}
      onClick={handleClick}
    >
      <div className={cn("p-2 rounded-full", colorMap[notification.type])}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn("text-sm line-clamp-1", !notification.is_read && "font-semibold")}>{notification.title}</p>
          {!notification.is_read && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
        </div>

        {notification.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notification.body}</p>}

        <div className="flex items-center gap-2 mt-1">
          {notification.sender && (
            <Avatar className="h-4 w-4">
              <AvatarImage src={notification.sender.avatar_url || undefined} />
              <AvatarFallback className="text-[8px]">{notification.sender.display_name?.charAt(0)}</AvatarFallback>
            </Avatar>
          )}
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
      </div>
    </div>
  )
}
