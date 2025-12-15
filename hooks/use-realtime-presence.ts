"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

export interface PresenceUser {
  userId: string
  displayName: string
  avatarUrl?: string
  lastSeen: string
}

export function useRealtimePresence(groupId: string, currentUserId: string, displayName: string) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([])
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const supabase = createClient()

  useEffect(() => {
    const channel: RealtimeChannel = supabase.channel(`presence:${groupId}`)

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState()
        const users: PresenceUser[] = []

        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.userId !== currentUserId) {
              users.push({
                userId: presence.userId,
                displayName: presence.displayName,
                avatarUrl: presence.avatarUrl,
                lastSeen: new Date().toISOString(),
              })
            }
          })
        })

        setOnlineUsers(users)
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("[v0] User joined:", newPresences)
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("[v0] User left:", leftPresences)
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

    const typingChannel = supabase.channel(`typing:${groupId}`)

    typingChannel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.userId !== currentUserId) {
          setTypingUsers((prev) => {
            const newSet = new Set(prev)
            newSet.add(payload.userId)
            setTimeout(() => {
              setTypingUsers((current) => {
                const updated = new Set(current)
                updated.delete(payload.userId)
                return updated
              })
            }, 3000)
            return newSet
          })
        }
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
      typingChannel.unsubscribe()
    }
  }, [groupId, currentUserId, displayName, supabase])

  const broadcastTyping = () => {
    supabase.channel(`typing:${groupId}`).send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUserId, displayName },
    })
  }

  return { onlineUsers, typingUsers, broadcastTyping }
}
