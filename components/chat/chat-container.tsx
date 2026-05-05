"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { ChatHeader } from "./chat-header"
import { MessageList } from "./message-list"
import { MessageInput } from "./message-input"
import { LayerFilter } from "./layer-filter"
import { AnimatedBackground, type BackgroundStyle } from "@/components/background/animated-background"
import { useRealtimePresence } from "@/hooks/use-realtime-presence"
import { TypingIndicator } from "./typing-indicator"
import { ImportantMessageToast } from "./important-message-toast"
import type { Group, GroupMember, Message, MessageLayer, ConversationNode, GroupSettings } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ChatContainerProps {
  groupId: string
  group: Group
  currentUserId: string
  members: GroupMember[]
  currentUserRole: "admin" | "member"
}

// Number of messages fetched per Supabase query page
const PAGE_SIZE = 50
// How many messages to show in the initial load and each "load more" batch
const INITIAL_WINDOW = 50
const LOAD_MORE_WINDOW = 30

// Splits an array into chunks to avoid hitting query limits on .in() calls
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

export function ChatContainer({
  groupId,
  group,
  currentUserId,
  members: initialMembers,
  currentUserRole,
}: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<GroupMember[]>(initialMembers)
  const [nodes, setNodes] = useState<ConversationNode[]>([])
  const [activeLayer, setActiveLayer] = useState<MessageLayer | "all">("all")
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [oldestMessageDate, setOldestMessageDate] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [importantMessageToasts, setImportantMessageToasts] = useState<Message[]>([])
  const [scrollDirection, setScrollDirection] = useState<"up" | "down">("up")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lastScrollYRef = useRef(0)
  const supabase = createClient()
  const isMounted = useRef(true)
  const pendingMessageIds = useRef<Set<string>>(new Set())

  const resetUnreadCount = useCallback(async () => {
    try {
      await supabase.from("group_unread_counts").upsert(
        {
          group_id: groupId,
          user_id: currentUserId,
          unread_count: 0,
        },
        { onConflict: "group_id,user_id" },
      )
    } catch (error) {
      console.error("Error resetting unread count:", error)
    }
  }, [groupId, currentUserId, supabase])

  // Mark all notifications for this cell as read when user enters
  const markCellNotificationsAsRead = useCallback(async () => {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("user_id", currentUserId)
        .eq("group_id", groupId)
        .eq("is_read", false)
    } catch (error) {
      console.error("Error marking cell notifications as read:", error)
    }
  }, [groupId, currentUserId, supabase])

  const fetchMembers = useCallback(async () => {
    const { data: membersData } = await supabase.from("group_members").select("*").eq("group_id", groupId)

    if (membersData && isMounted.current) {
      const userIds = membersData.map((m) => m.user_id)
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, bio")
        .in("id", userIds)

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])
      const membersWithProfiles = membersData.map((m) => ({
        ...m,
        profile: profileMap.get(m.user_id) || null,
      }))
      setMembers(membersWithProfiles as GroupMember[])
    }
  }, [groupId, supabase])

  const fetchNodes = useCallback(async () => {
    const { data } = await supabase
      .from("conversation_nodes")
      .select("*")
      .eq("group_id", groupId)
      .order("sort_order", { ascending: true })

    if (data && isMounted.current) {
      const nodeIds = data.map((n) => n.id)
      const { data: messageCounts } = await supabase.from("messages").select("node_id").in("node_id", nodeIds)

      const countMap: Record<string, number> = {}
      messageCounts?.forEach((m) => {
        if (m.node_id) {
          countMap[m.node_id] = (countMap[m.node_id] || 0) + 1
        }
      })

      const nodesWithCounts = data.map((node) => ({
        ...node,
        messages_count: countMap[node.id] || 0,
      }))

      setNodes(nodesWithCounts)
    }
  }, [groupId, supabase])

  // Enriches a batch of raw messages with sender profiles and reply previews.
  // Optimized: skips read counts and reactions on initial load for performance.
  // Reactions are handled via realtime subscriptions and local state.
  const enrichMessages = useCallback(
    async (messagesData: Record<string, unknown>[]) => {
      if (!messagesData.length) return []

      const senderIds = [...new Set(messagesData.map((m) => m.sender_id as string))]

      // Fetch profiles for all unique senders in a single query (max ~50 senders)
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", senderIds)
      
      const profileMap = new Map<string, { id: string; display_name: string; avatar_url: string | null }>()
      profiles?.forEach((p) => profileMap.set(p.id, p))

      // Fetch reply-to previews — only unique IDs
      const replyMessagesMap: Record<string, { content: string; sender?: { display_name: string } }> = {}
      const replyToIds = [...new Set(messagesData.filter((m) => m.reply_to).map((m) => m.reply_to as string))]
      if (replyToIds.length > 0) {
        const { data: replyMsgs } = await supabase
          .from("messages")
          .select("id, content, sender_id")
          .in("id", replyToIds)
        
        replyMsgs?.forEach((rm) => {
          const senderProfile = profileMap.get(rm.sender_id)
          replyMessagesMap[rm.id] = {
            content: rm.content,
            sender: senderProfile ? { display_name: senderProfile.display_name } : undefined,
          }
        })
      }

      return messagesData.map((m) => ({
        ...m,
        sender: profileMap.get(m.sender_id as string) || null,
        read_count: 0,
        reactions: [],
        reply_to_message: m.reply_to ? replyMessagesMap[m.reply_to as string] ?? null : null,
      })) as Message[]
    },
    [supabase],
  )

  // Fetches ALL messages page by page to bypass the PostgREST 1000-row default cap.
  // Stores only the latest PAGE_SIZE*5 (500) messages in state for performance,
  // but keeps track of the oldest date for "load more" scrolling upward.
  const fetchMessages = useCallback(async () => {
    setIsLoading(true)

    // Fetch the total count first to know if there are older messages
    const { count: totalCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId)

    if (!isMounted.current) return

    const total = totalCount ?? 0
    const hasMore = total > INITIAL_WINDOW

    // Fetch only the latest INITIAL_WINDOW messages (ordered ascending for display)
    const skip = hasMore ? total - INITIAL_WINDOW : 0
    const { data: rawMessages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true })
      .range(skip, skip + INITIAL_WINDOW - 1)

    if (error) {
      console.error("Error fetching messages:", error)
      setIsLoading(false)
      return
    }

    if (!isMounted.current) return

    const allMessages = rawMessages ?? []

    if (allMessages.length === 0) {
      setMessages([])
      setHasMoreMessages(false)
      setOldestMessageDate(null)
      setIsLoading(false)
      return
    }

    const enriched = await enrichMessages(allMessages)
    if (!isMounted.current) return

    setMessages(enriched)
    setHasMoreMessages(hasMore)
    setOldestMessageDate(hasMore ? (allMessages[0]?.created_at as string) ?? null : null)

    // Mark unread in chunks to stay within API limits
    const unreadIds = enriched.filter((m) => m.sender_id !== currentUserId).map((m) => m.id as string)
    if (unreadIds.length > 0) {
      // Use a single batch request instead of multiple to avoid overwhelming the API
      fetch("/api/messages/mark-read-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds: unreadIds.slice(0, 100) }),
      }).catch((err) => console.error("Failed to mark messages as read:", err))
    }

    setIsLoading(false)
    setTimeout(scrollToBottom, 100)
  }, [groupId, supabase, currentUserId, enrichMessages])

  // Loads older messages when user scrolls to the top.
  // Fetches LOAD_MORE_WINDOW messages before oldestMessageDate in a single query.
  const loadMoreMessages = useCallback(async () => {
    if (!oldestMessageDate || isLoadingMore) return
    setIsLoadingMore(true)

    // Single query - fetch LOAD_MORE_WINDOW + 1 to check if there are more
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("group_id", groupId)
      .lt("created_at", oldestMessageDate)
      .order("created_at", { ascending: false })
      .limit(LOAD_MORE_WINDOW + 1)

    if (!isMounted.current) { setIsLoadingMore(false); return }

    if (error || !data || data.length === 0) {
      setHasMoreMessages(false)
      setIsLoadingMore(false)
      return
    }

    // If we got more than the window, there are still older messages to load
    const stillHasMore = data.length > LOAD_MORE_WINDOW
    // Reverse to get ascending order and trim to window size
    const olderMessages = (stillHasMore ? data.slice(0, LOAD_MORE_WINDOW) : data).reverse()

    const enriched = await enrichMessages(olderMessages)
    if (!isMounted.current) { setIsLoadingMore(false); return }

    // Capture scroll position BEFORE prepending
    const container = scrollContainerRef.current
    const scrollHeightBefore = container?.scrollHeight ?? 0
    const scrollTopBefore = container?.scrollTop ?? 0

    setMessages((prev) => [...enriched, ...prev])
    setHasMoreMessages(stillHasMore)
    setOldestMessageDate(enriched[0]?.created_at ?? null)
    setIsLoadingMore(false)

    // Restore scroll position after React re-renders
    requestAnimationFrame(() => {
      if (!container) return
      const added = container.scrollHeight - scrollHeightBefore
      container.scrollTop = scrollTopBefore + added
    })
  }, [oldestMessageDate, isLoadingMore, groupId, supabase, enrichMessages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const currentProfile = members.find((m) => m.user_id === currentUserId)?.profile
  const { onlineUsers, typingUsers, broadcastTyping } = useRealtimePresence(
    groupId,
    currentUserId,
    currentProfile?.display_name || "مستخدم",
  )

  const typingUserNames = Array.from(typingUsers).map((userId) => {
    const member = members.find((m) => m.user_id === userId)
    return member?.profile?.display_name || "مستخدم"
  })

  // Store active cell ID in IndexedDB for service worker to check
  useEffect(() => {
    const setActiveCell = async () => {
      try {
        if ('indexedDB' in window) {
          const dbRequest = indexedDB.open('synaptic-app', 1)
          dbRequest.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            if (!db.objectStoreNames.contains('state')) {
              db.createObjectStore('state')
            }
          }
          dbRequest.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            const tx = db.transaction('state', 'readwrite')
            const store = tx.objectStore('state')
            store.put(groupId, 'activeCellId')
          }
        }
      } catch (e) {
        console.error('Failed to set active cell:', e)
      }
    }
    setActiveCell()

    return () => {
      // Clear active cell when leaving
      try {
        if ('indexedDB' in window) {
          const dbRequest = indexedDB.open('synaptic-app', 1)
          dbRequest.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            const tx = db.transaction('state', 'readwrite')
            const store = tx.objectStore('state')
            store.delete('activeCellId')
          }
        }
      } catch (e) {
        console.error('Failed to clear active cell:', e)
      }
    }
  }, [groupId])

  useEffect(() => {
    isMounted.current = true
    fetchMessages()
    fetchMembers()
    fetchNodes()
    resetUnreadCount()
    markCellNotificationsAsRead()

    const channelId = `chat-${groupId}-${Date.now()}`

    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          if (!isMounted.current) return

          const newMsg = payload.new

          if (pendingMessageIds.current.has(newMsg.id)) {
            pendingMessageIds.current.delete(newMsg.id)
            return
          }

          if (newMsg.layer === "upper" && newMsg.sender_id !== currentUserId) {
            const { data: senderProfile } = await supabase
              .from("profiles")
              .select("id, display_name, avatar_url")
              .eq("id", newMsg.sender_id)
              .single()

            const messageWithSender = { ...newMsg, sender: senderProfile } as Message
            setImportantMessageToasts((prev) => [...prev, messageWithSender])
          }

          let replyToMessage = null
          if (newMsg.reply_to) {
            const { data: replyMsg } = await supabase
              .from("messages")
              .select("id, content, sender_id")
              .eq("id", newMsg.reply_to)
              .single()

            if (replyMsg) {
              const { data: replySender } = await supabase
                .from("profiles")
                .select("display_name")
                .eq("id", replyMsg.sender_id)
                .single()

              replyToMessage = {
                content: replyMsg.content,
                sender: replySender ? { display_name: replySender.display_name } : undefined,
              }
            }
          }

          if (newMsg.sender_id === currentUserId) {
            // Get sender profile for the message
            const senderProfile = members.find((m) => m.user_id === currentUserId)?.profile

            setMessages((prev) => {
              const hasTempMessage = prev.some((m) => m.id.startsWith("temp-") && m.sender_id === currentUserId)
              if (hasTempMessage) {
                let replaced = false
                return prev.map((m) => {
                  if (!replaced && m.id.startsWith("temp-") && m.sender_id === currentUserId) {
                    replaced = true
                    return {
                      ...newMsg,
                      sender: senderProfile || m.sender,
                      reply_to_message: replyToMessage,
                    } as Message
                  }
                  return m
                })
              }
              if (prev.some((m) => m.id === newMsg.id)) return prev
              return prev
            })
            return
          }

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev

            supabase
              .from("profiles")
              .select("id, display_name, avatar_url")
              .eq("id", newMsg.sender_id)
              .single()
              .then(({ data: profile }) => {
                if (isMounted.current) {
                  setMessages((current) => current.map((m) => (m.id === newMsg.id ? { ...m, sender: profile } : m)))
                }
              })

            return [...prev, { ...newMsg, sender: null, reply_to_message: replyToMessage } as Message]
          })
          setTimeout(scrollToBottom, 100)
          fetchNodes()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          if (!isMounted.current) return
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id))
          fetchNodes()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          if (!isMounted.current) return
          setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m)))
        },
      )
      .subscribe()

    const membersChannel = supabase
      .channel(`members-${groupId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_members",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          if (isMounted.current) fetchMembers()
        },
      )
      .subscribe()

    const nodesChannel = supabase
      .channel(`nodes-${groupId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_nodes",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          if (isMounted.current) fetchNodes()
        },
      )
      .subscribe()

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isMounted.current) {
        resetUnreadCount()
        // Restore active cell when app comes back to foreground
        try {
          if ('indexedDB' in window) {
            const dbRequest = indexedDB.open('synaptic-app', 1)
            dbRequest.onsuccess = (event) => {
              const db = (event.target as IDBOpenDBRequest).result
              const tx = db.transaction('state', 'readwrite')
              tx.objectStore('state').put(groupId, 'activeCellId')
            }
          }
        } catch (e) {
          console.error('Failed to restore active cell:', e)
        }
      } else if (document.visibilityState === "hidden") {
        // Clear active cell when app goes to background so notifications can be shown
        try {
          if ('indexedDB' in window) {
            const dbRequest = indexedDB.open('synaptic-app', 1)
            dbRequest.onsuccess = (event) => {
              const db = (event.target as IDBOpenDBRequest).result
              const tx = db.transaction('state', 'readwrite')
              tx.objectStore('state').delete('activeCellId')
            }
          }
        } catch (e) {
          console.error('Failed to clear active cell:', e)
        }
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      isMounted.current = false
      supabase.removeChannel(channel)
      supabase.removeChannel(membersChannel)
      supabase.removeChannel(nodesChannel)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [groupId, fetchMessages, fetchMembers, fetchNodes, supabase, currentUserId, resetUnreadCount, markCellNotificationsAsRead])

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop
      const direction = currentScrollY > lastScrollYRef.current ? "down" : "up"

      if (direction !== scrollDirection) {
        setScrollDirection(direction)
      }

      lastScrollYRef.current = currentScrollY
    }

    scrollContainer.addEventListener("scroll", handleScroll)
    return () => scrollContainer.removeEventListener("scroll", handleScroll)
  }, [scrollDirection])

  const filteredMessages =
    activeLayer === "all"
      ? selectedNodeId
        ? messages.filter((m) => m.node_id === selectedNodeId)
        : messages
      : messages.filter((m) => m.layer === activeLayer && (!selectedNodeId || m.node_id === selectedNodeId))

  const handleReply = (message: Message) => {
    setReplyingTo(message)
    setEditingMessage(null)
  }

  const handleEditMessage = (message: Message) => {
    setEditingMessage(message)
    setReplyingTo(null)
  }

  const handleDeleteMessage = async (messageId: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", messageId)
    if (error) {
      console.error("Error deleting message:", error)
      alert("حدث خطأ في حذف الرسالة")
    }
  }

  const sendMessage = async (
    content: string,
    layer: MessageLayer,
    nodeId?: string | null,
    visibleTo?: string[],
    attachmentUrl?: string,
    replyTo?: string | null,
    replyPreview?: { id: string; content: string; user_name: string } | null,
    attachments?: Array<{ url: string; type: string; name: string; size: number }>,
  ) => {
    const tempId = `temp-${Date.now()}`
    const currentProfile = members.find((m) => m.user_id === currentUserId)?.profile

    const replyToMessageData = replyingTo
      ? {
          content: replyingTo.content,
          sender: replyingTo.sender ? { display_name: replyingTo.sender.display_name } : { display_name: "مستخدم" },
        }
      : replyPreview
        ? {
            content: replyPreview.content,
            sender: { display_name: replyPreview.user_name },
          }
        : null

    const optimisticMessage: Message = {
      id: tempId,
      group_id: groupId,
      sender_id: currentUserId,
      content,
      layer,
      node_id: nodeId || null,
      visible_to: layer === "shadow" ? visibleTo || null : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      reply_to: replyTo || null,
      reply_to_message: replyToMessageData,
      sender: currentProfile || {
        id: currentUserId,
        display_name: "أنت",
        avatar_url: null,
        bio: null,
        created_at: "",
        updated_at: "",
      },
      attachment_url: attachmentUrl || null,
      attachments: attachments || null,
    }

    setMessages((prev) => [...prev, optimisticMessage])
    setReplyingTo(null)
    setTimeout(scrollToBottom, 50)

    const insertData: Record<string, unknown> = {
      group_id: groupId,
      sender_id: currentUserId,
      content,
      layer,
      node_id: nodeId || null,
      visible_to: layer === "shadow" ? visibleTo : null,
      reply_to: replyTo || null,
      reply_preview: replyPreview || null,
    }

    if (attachmentUrl) {
      insertData.attachment_url = attachmentUrl
    }

    if (attachments && attachments.length > 0) {
      insertData.attachments = attachments
    }

    const { data, error } = await supabase.from("messages").insert(insertData).select().single()

    if (error) {
      console.error("Error sending message:", error)
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      alert("حدث خطأ في إرسال الرسالة")
    } else if (data) {
      pendingMessageIds.current.add(data.id)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                ...data,
                sender: optimisticMessage.sender,
                reply_to_message: optimisticMessage.reply_to_message,
                attachments: optimisticMessage.attachments,
              }
            : m,
        ),
      )

      try {
        const recipientIds = members.filter((m) => m.user_id !== currentUserId).map((m) => m.user_id)

        if (recipientIds.length > 0) {
          fetch("/api/notifications/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userIds: recipientIds,
              type: "new_message",
              title: `${currentProfile?.display_name || "مستخدم"} في ${group.name}`,
              body: content.substring(0, 150),
              groupId,
              senderId: currentUserId,
              data: {
                url: `/chat/${groupId}`,
                groupId,
                groupName: group.name,
                senderId: currentUserId,
                senderName: currentProfile?.display_name || "مستخدم",
                senderAvatar: currentProfile?.avatar_url || "",
                cellAvatar: group.avatar_url || "",
                messageId: data.id,
              },
            }),
          }).catch((err) => console.error("Failed to send notification:", err))
        }
      } catch (err) {
        console.error("Notification error:", err)
      }
    }
  }

  const groupSettings: GroupSettings = group.settings || {
    upper_layer_permission: "admin_only",
    allow_notebook: true,
    allow_mindmap: true,
    allow_smart_summary: true,
  }

  const removeImportantToast = (messageId: string) => {
    setImportantMessageToasts((prev) => prev.filter((m) => m.id !== messageId))
  }

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden">
      {importantMessageToasts.map((message) => (
        <ImportantMessageToast key={message.id} message={message} onClose={() => removeImportantToast(message.id)} />
      ))}

      {group.background_style && group.background_style !== "none" && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <AnimatedBackground style={(group.background_style as BackgroundStyle) || "neural_mesh"} />
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full overflow-hidden bg-transparent">
        <ChatHeader
          group={group}
          members={members}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
          onMembersUpdate={fetchMembers}
        />

        <LayerFilter
          activeLayer={activeLayer}
          onLayerChange={setActiveLayer}
          nodes={nodes}
          selectedNodeId={selectedNodeId}
          onNodeChange={setSelectedNodeId}
          onNodesUpdate={fetchNodes}
          currentUserId={currentUserId}
          isAdmin={currentUserRole === "admin"}
          groupId={groupId}
          messages={messages.map((m) => ({
            id: m.id,
            content: m.content,
            sender_id: m.sender_id,
            created_at: m.created_at,
          }))}
        />

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden bg-transparent chat-scroll-container pb-32"
        >
        <MessageList
          messages={filteredMessages}
          currentUserId={currentUserId}
          members={members}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMoreMessages={hasMoreMessages}
          onLoadMore={loadMoreMessages}
          onReplySelect={handleReply}
          onEditSelect={handleEditMessage}
          onMessageDeleted={handleDeleteMessage}
          scrollContainerRef={scrollContainerRef}
          messagesEndRef={messagesEndRef}
          groupId={groupId}
        />
          <TypingIndicator userNames={typingUserNames} />
        </div>

        <div className={cn("fixed inset-x-0 z-50 w-full transition-all duration-300 pb-safe", "bottom-0")}>
          <MessageInput
            onSend={sendMessage}
            members={members}
            currentUserId={currentUserId}
            nodes={nodes}
            selectedNodeId={selectedNodeId}
            groupId={groupId}
            isAdmin={currentUserRole === "admin"}
            groupSettings={groupSettings}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            onTyping={broadcastTyping}
            editingMessage={editingMessage}
            onCancelEdit={() => setEditingMessage(null)}
          />
        </div>
      </div>
    </div>
  )
}
