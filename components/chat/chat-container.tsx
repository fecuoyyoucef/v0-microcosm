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
import { OnlineIndicator } from "./online-indicator"
import { ImportantMessageToast } from "./important-message-toast"
import type { Group, GroupMember, Message, MessageLayer, ConversationNode, GroupSettings } from "@/lib/types"

interface ChatContainerProps {
  groupId: string
  group: Group
  currentUserId: string
  members: GroupMember[]
  currentUserRole: "admin" | "member"
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
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [importantMessageToasts, setImportantMessageToasts] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
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

  const fetchMessages = useCallback(async () => {
    setIsLoading(true)

    const { data: messagesData, error } = await supabase
      .from("messages")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching messages:", error)
      setIsLoading(false)
      return
    }

    if (messagesData && messagesData.length > 0 && isMounted.current) {
      const senderIds = [...new Set(messagesData.map((m) => m.sender_id))]
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", senderIds)

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])
      const messageIds = messagesData.map((m) => m.id)

      // Fetch read counts
      const { data: readCounts } = await supabase
        .from("message_reads")
        .select("message_id")
        .in("message_id", messageIds)

      const readCountMap: Record<string, number> = {}
      readCounts?.forEach((r) => {
        readCountMap[r.message_id] = (readCountMap[r.message_id] || 0) + 1
      })

      const { data: reactionsData } = await supabase.from("message_reactions").select("*").in("message_id", messageIds)

      const reactionsMap: Record<string, Array<{ id: string; user_id: string; reaction: string }>> = {}
      reactionsData?.forEach((r) => {
        if (!reactionsMap[r.message_id]) {
          reactionsMap[r.message_id] = []
        }
        reactionsMap[r.message_id].push({
          id: r.id,
          user_id: r.user_id,
          reaction: r.reaction,
        })
      })

      const replyToIds = messagesData.filter((m) => m.reply_to).map((m) => m.reply_to)
      const replyMessagesMap: Record<string, { content: string; sender?: { display_name: string } }> = {}

      if (replyToIds.length > 0) {
        const { data: replyMessages } = await supabase
          .from("messages")
          .select("id, content, sender_id")
          .in("id", replyToIds)

        replyMessages?.forEach((rm) => {
          const senderProfile = profileMap.get(rm.sender_id)
          replyMessagesMap[rm.id] = {
            content: rm.content,
            sender: senderProfile ? { display_name: senderProfile.display_name } : undefined,
          }
        })
      }

      const messagesWithSender = messagesData.map((m) => ({
        ...m,
        sender: profileMap.get(m.sender_id) || null,
        read_count: readCountMap[m.id] || 0,
        reactions: reactionsMap[m.id] || [],
        reply_to_message: m.reply_to ? replyMessagesMap[m.reply_to] : null,
      }))
      setMessages(messagesWithSender as Message[])

      const unreadMessageIds = messagesData.filter((m) => m.sender_id !== currentUserId).map((m) => m.id)

      if (unreadMessageIds.length > 0) {
        await fetch("/api/messages/mark-read-bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageIds: unreadMessageIds }),
        }).catch((err) => console.error("Failed to mark messages as read:", err))
      }
    } else if (isMounted.current) {
      setMessages([])
    }

    if (isMounted.current) {
      setIsLoading(false)
      setTimeout(scrollToBottom, 100)
    }
  }, [groupId, supabase, currentUserId])

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
    <div className="relative flex flex-col h-screen w-full max-w-full box-border overflow-hidden">
      {importantMessageToasts.map((message) => (
        <ImportantMessageToast key={message.id} message={message} onClose={() => removeImportantToast(message.id)} />
      ))}

      {group.background_style && group.background_style !== "none" && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <AnimatedBackground style={(group.background_style as BackgroundStyle) || "neural_mesh"} />
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full w-full max-w-full bg-transparent overflow-hidden">
        <ChatHeader
          group={group}
          members={members}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
          onMembersUpdate={fetchMembers}
        />

        <OnlineIndicator onlineUsers={onlineUsers} />

        <div className="flex-1 flex flex-col min-h-0 w-full max-w-full overflow-hidden relative">
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

          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-transparent px-2 chat-scroll-container">
            <MessageList
              messages={filteredMessages}
              currentUserId={currentUserId}
              members={members}
              isLoading={isLoading}
              messagesEndRef={messagesEndRef}
              nodes={nodes}
              onReplySelect={handleReply}
              onEditSelect={handleEditMessage}
              onMessageDeleted={(messageId) => {
                setMessages((prev) => prev.filter((m) => m.id !== messageId))
              }}
            />
            <TypingIndicator userNames={typingUserNames} />
          </div>
        </div>

        <div className="w-full max-w-full mt-auto">
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
