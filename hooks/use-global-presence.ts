"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

export interface GlobalPresenceUser {
  userId: string
  displayName: string
  avatarUrl?: string
  lastSeen: string
}

/**
 * Global presence hook that tracks users who are online in the entire app.
 * Unlike useRealtimePresence which tracks users in a specific group,
 * this hook tracks all users who are currently using the app.
 */
export function useGlobalPresence(currentUserId: string, displayName: string) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())
  const supabase = createClient()

  useEffect(() => {
    if (!currentUserId) return

    const channel: RealtimeChannel = supabase.channel("presence:global")

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState()
        const userIds = new Set<string>()

        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            userIds.add(presence.userId)
          })
        })

        setOnlineUserIds(userIds)
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        setOnlineUserIds((prev) => {
          const updated = new Set(prev)
          newPresences.forEach((p: any) => updated.add(p.userId))
          return updated
        })
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        setOnlineUserIds((prev) => {
          const updated = new Set(prev)
          leftPresences.forEach((p: any) => updated.delete(p.userId))
          return updated
        })
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId: currentUserId,
            displayName,
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [currentUserId, displayName, supabase])

  const isUserOnline = useCallback(
    (userId: string) => {
      return onlineUserIds.has(userId)
    },
    [onlineUserIds]
  )

  return { onlineUserIds, isUserOnline, onlineCount: onlineUserIds.size }
}
