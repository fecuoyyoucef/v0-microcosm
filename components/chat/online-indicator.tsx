"use client"

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"
import type { PresenceUser } from "@/hooks/use-realtime-presence"

interface OnlineIndicatorProps {
  onlineUsers: PresenceUser[]
}

export function OnlineIndicator({ onlineUsers }: OnlineIndicatorProps) {
  if (onlineUsers.length === 0) return null

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
      <Users className="w-4 h-4 text-green-500" />
      <span className="text-sm text-muted-foreground">متصل الآن: {onlineUsers.length}</span>
      <div className="flex -space-x-2">
        {onlineUsers.slice(0, 3).map((user) => (
          <Avatar key={user.userId} className="w-6 h-6 border-2 border-background">
            <AvatarImage src={user.avatarUrl || "/placeholder.svg"} />
            <AvatarFallback className="text-xs">{user.displayName.slice(0, 2)}</AvatarFallback>
          </Avatar>
        ))}
        {onlineUsers.length > 3 && (
          <Badge variant="secondary" className="ml-2 h-6 px-2 text-xs">
            +{onlineUsers.length - 3}
          </Badge>
        )}
      </div>
    </div>
  )
}
