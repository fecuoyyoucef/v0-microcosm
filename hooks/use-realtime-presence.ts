"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

export interface PresenceUser {
  userId: string
  displayName: string
  avatarUrl?: string
  lastSeen: string
}

// How long to wait after last typing event before removing user from typing list
const TYPING_TIMEOUT = 4000

export function useRealtimePresence(groupId: string, currentUserId: string, displayName: string) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([])
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const supabase = createClient()
  
  // Track timeouts per user to properly extend/reset them
  const typingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())

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
      .on("presence", { event: "join" }, ({ newPresences }) => {
        console.log("[v0] User joined:", newPresences)
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
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
          const userId = payload.userId
          
          // Clear existing timeout for this user if any
          const existingTimeout = typingTimeouts.current.get(userId)
          if (existingTimeout) {
            clearTimeout(existingTimeout)
          }
          
          // Add user to typing set (if not already there)
          setTypingUsers((prev) => {
            const newSet = new Set(prev)
            newSet.add(userId)
            return newSet
          })
          
          // Set new timeout to remove user after TYPING_TIMEOUT
          const timeout = setTimeout(() => {
            setTypingUsers((current) => {
              const updated = new Set(current)
              updated.delete(userId)
              return updated
            })
            typingTimeouts.current.delete(userId)
          }, TYPING_TIMEOUT)
          
          typingTimeouts.current.set(userId, timeout)
        }
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
      typingChannel.unsubscribe()
      // Clear all typing timeouts
      typingTimeouts.current.forEach((timeout) => clearTimeout(timeout))
      typingTimeouts.current.clear()
    }
  }, [groupId, currentUserId, displayName, supabase])

  const broadcastTyping = useCallback(() => {
    supabase.channel(`typing:${groupId}`).send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUserId, displayName },
    })
  }, [supabase, groupId, currentUserId, displayName])

  return { onlineUsers, typingUsers, broadcastTyping }
}
