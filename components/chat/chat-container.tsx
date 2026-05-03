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
const PAGE_SIZE = 100
// How many messages to show in the initial load and each "load more" batch
const INITIAL_WINDOW = 500
const LOAD_MORE_WINDOW = 500

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
      setNodes((prevNodes) => {
        const nodesWithCounts = data.map((node) => ({
          ...node,
          // Preserve existing count so we don't need an extra DB round-trip
          messages_count: prevNodes.find((n) => n.id === node.id)?.messages_count ?? 0,
        }))
        return nodesWithCounts
      })
    }
  }, [groupId, supabase])

  // Recompute node message counts from the already-loaded messages array (no extra DB query)
  const updateNodeCountsFromMessages = useCallback((loadedMessages: Message[]) => {
    const countMap: Record<string, number> = {}
    loadedMessages.forEach((m) => {
      if (m.node_id) countMap[m.node_id] = (countMap[m.node_id] || 0) + 1
    })
    setNodes((prev) => prev.map((n) => ({ ...n, messages_count: countMap[n.id] ?? n.messages_count })))
  }, [])

  // Enriches a batch of raw messages with sender profiles and reply previews only.
  // Reads and reactions are loaded lazily after messages are rendered.
  const enrichMessages = useCallback(
    async (messagesData: Record<string, unknown>[]) => {
      if (!messagesData.length) return []

      const senderIds = [...new Set(messagesData.map((m) => m.sender_id as string))]

      // Fetch profiles for all unique senders
      const profileMap = new Map<string, { id: string; display_name: string; avatar_url: string | null }>()
      const profileChunks = chunkArray(senderIds, 200)
      await Promise.all(
        profileChunks.map(async (chunk) => {
          const { data } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", chunk)
          data?.forEach((p) => profileMap.set(p.id, p))
        }),
      )

      // Fetch reply-to previews — only unique IDs, chunked
      const replyMessagesMap: Record<string, { content: string; sender?: { display_name: string } }> = {}
      const replyToIds = [...new Set(messagesData.filter((m) => m.reply_to).map((m) => m.reply_to as string))]
      if (replyToIds.length > 0) {
        await Promise.all(
          chunkArray(replyToIds, 200).map(async (chunk) => {
            const { data } = await supabase.from("messages").select("id, content, sender_id").in("id", chunk)
            data?.forEach((rm) => {
              const senderProfile = profileMap.get(rm.sender_id)
              replyMessagesMap[rm.id] = {
                content: rm.content,
                sender: senderProfile ? { display_name: senderProfile.display_name } : undefined,
              }
            })
          }),
        )
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

  // Loads reactions for the current visible messages in the background after initial render.
  const loadReactionsInBackground = useCallback(
    async (messageIds: string[]) => {
      if (!messageIds.length) return
      const reactionsMap: Record<string, Array<{ id: string; user_id: string; reaction: string }>> = {}
      await Promise.all(
        chunkArray(messageIds, 500).map(async (chunk) => {
          const { data } = await supabase.from("message_reactions").select("*").in("message_id", chunk)
          data?.forEach((r) => {
            if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = []
            reactionsMap[r.message_id].push({ id: r.id, user_id: r.user_id, reaction: r.reaction })
          })
        }),
      )
      if (!isMounted.current) return
      setMessages((prev) =>
        prev.map((m) =>
          reactionsMap[m.id] ? { ...m, reactions: reactionsMap[m.id] } : m,
        ),
      )
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
    setIsLoading(false)
    setTimeout(scrollToBottom, 100)

    // Update node counts from loaded messages (no extra DB query)
    updateNodeCountsFromMessages(enriched)

    // Load reactions in background after messages are visible
    const messageIds = enriched.map((m) => m.id as string)
    loadReactionsInBackground(messageIds)

    // Mark messages as read in background (fire and forget)
    const unreadIds = enriched.filter((m) => m.sender_id !== currentUserId).map((m) => m.id as string)
    if (unreadIds.length > 0) {
      const batches = chunkArray(unreadIds, 200)
      batches.forEach((batch) => {
        fetch("/api/messages/mark-read-bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageIds: batch }),
        }).catch((err) => console.error("Failed to mark messages as read:", err))
      })
    }
  }, [groupId, supabase, currentUserId, enrichMessages, loadReactionsInBackground, updateNodeCountsFromMessages])

  // Loads older messages when user scrolls to the top.
  // Fetches up to LOAD_MORE_WINDOW messages before oldestMessageDate,
  // then checks if there are even older ones to determine hasMore.
  const loadMoreMessages = useCallback(async () => {
    if (!oldestMessageDate || isLoadingMore) return
    setIsLoadingMore(true)

    // Fetch one extra beyond the window so we know if there are more
    let allOlderMessages: Record<string, unknown>[] = []
    let from = 0
    let keepPaging = true

    while (keepPaging) {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("group_id", groupId)
        .lt("created_at", oldestMessageDate)
        .order("created_at", { ascending: true })
        .range(from, from + PAGE_SIZE - 1)

      if (error || !data || data.length === 0) { keepPaging = false; break }
      allOlderMessages = [...allOlderMessages, ...data]
      from += PAGE_SIZE
      // Stop once we have enough for one window (+ 1 to detect more)
      if (data.length < PAGE_SIZE || allOlderMessages.length >= LOAD_MORE_WINDOW + 1) keepPaging = false
    }

    if (!isMounted.current) { setIsLoadingMore(false); return }

    if (allOlderMessages.length === 0) {
      setHasMoreMessages(false)
      setIsLoadingMore(false)
      return
    }

    // If we got more than the window, there are still older messages to load
    const stillHasMore = allOlderMessages.length > LOAD_MORE_WINDOW
    const olderMessages = stillHasMore ? allOlderMessages.slice(-LOAD_MORE_WINDOW) : allOlderMessages

    const enriched = await enrichMessages(olderMessages)
    if (!isMounted.current) { setIsLoadingMore(false); return }

    // Capture scroll position BEFORE prepending so we can restore it after React re-renders,
    // preventing the viewport from jumping to the top when new messages are inserted above.
    const container = scrollContainerRef.current
    const scrollHeightBefore = container?.scrollHeight ?? 0
    const scrollTopBefore = container?.scrollTop ?? 0

    setMessages((prev) => [...enriched, ...prev])
    setHasMoreMessages(stillHasMore)
    setOldestMessageDate(enriched[0]?.created_at ?? null)
    setIsLoadingMore(false)

    // Load reactions for the newly prepended messages in background
    loadReactionsInBackground(enriched.map((m) => m.id as string))

    // After state flush, restore the relative scroll position so the user
    // stays exactly where they were before the prepend.
    requestAnimationFrame(() => {
      if (!container) return
      const added = container.scrollHeight - scrollHeightBefore
      container.scrollTop = scrollTopBefore + added
    })
  }, [oldestMessageDate, isLoadingMore, groupId, supabase, enrichMessages, loadReactionsInBackground])

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

  useEffect(() => {
    isMounted.current = true
    fetchMessages()
    fetchMembers()
    fetchNodes()
    resetUnreadCount()

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
  }, [groupId, fetchMessages, fetchMembers, fetchNodes, supabase, currentUserId, resetUnreadCount])

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
              data: {
                url: `/chat/${groupId}`,
                groupId,
                groupName: group.name,
                senderId: currentUserId,
                senderName: currentProfile?.display_name || "مستخدم",
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
