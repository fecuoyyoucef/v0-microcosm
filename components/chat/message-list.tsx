"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { CheckCheck, Reply, Trash2, Languages, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"
import type { Message, GroupMember, ConversationNode } from "@/lib/types"
import { cn } from "@/lib/utils"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const avatarColors = [
  "bg-gradient-to-br from-blue-400 to-blue-600",
  "bg-gradient-to-br from-emerald-400 to-emerald-600",
  "bg-gradient-to-br from-violet-400 to-violet-600",
  "bg-gradient-to-br from-amber-400 to-amber-600",
  "bg-gradient-to-br from-rose-400 to-rose-600",
  "bg-gradient-to-br from-cyan-400 to-cyan-600",
  "bg-gradient-to-br from-pink-400 to-pink-600",
  "bg-gradient-to-br from-indigo-400 to-indigo-600",
]

const getAvatarColor = (str: string) => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

const quickReactions = ["👍", "❤️", "😂", "😮", "😢", "🔥"]

interface MessageListProps {
  messages: Message[]
  groupId?: string // Assuming groupId is relevant for fetching members or context
  currentUserId: string
  members?: GroupMember[] // Make members optional and default to empty array
  isLoading: boolean
  messagesEndRef: React.RefObject<HTMLDivElement>
  nodes: ConversationNode[]
  onReply?: (message: Message) => void
  onDelete?: (messageId: string) => void
}

interface Reaction {
  id: string
  message_id: string
  user_id: string
  reaction: string
  created_at: string
}

const layerStyles: Record<string, { bg: string; ownBg: string; icon: string }> = {
  upper: {
    bg: "bg-orange-100/80 dark:bg-orange-900/30",
    ownBg: "bg-gradient-to-br from-orange-500 to-orange-600",
    icon: "🟠",
  },
  standard: { bg: "bg-muted/80", ownBg: "bg-gradient-to-br from-primary to-primary/80", icon: "" },
  shadow: {
    bg: "bg-gray-200/60 dark:bg-gray-800/40",
    ownBg: "bg-gradient-to-br from-gray-500 to-gray-600",
    icon: "🔘",
  },
}

export function MessageList({
  messages,
  currentUserId,
  members = [], // Default members to empty array
  isLoading,
  messagesEndRef,
  nodes,
  onReply,
  onDelete,
}: MessageListProps) {
  const supabase = createClient()
  const containerRef = useRef<HTMLDivElement>(null)
  const reactionPickerRef = useRef<HTMLDivElement>(null) // Keep this for potential future use or if needed for context
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({})
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null)
  const [showReactionsFor, setShowReactionsFor] = useState<string | null>(null)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null)
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({})
  const [translatingMessages, setTranslatingMessages] = useState<Set<string>>(new Set())
  const [showActionsFor, setShowActionsFor] = useState<string | null>(null) // Keep this, might be useful for future actions
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null) // Keep this, might be useful for future long press actions
  const [longPressActive, setLongPressActive] = useState<string | null>(null) // Keep this, might be useful for future long press actions

  const handleTouchStart = (messageId: string, e: React.TouchEvent) => {
    // Implement touch start logic here
  }

  const handleTouchEnd = () => {
    // Implement touch end logic here
  }

  const handleTouchMove = () => {
    // Implement touch move logic here
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target as Node)) {
        setShowReactionsFor(null)
      }
      // Close actions menu when clicking outside
      if (showActionsFor && !event.target!.closest(".actions-menu-container")) {
        // Assuming a class for the actions menu container
        setShowActionsFor(null)
        setLongPressActive(null)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showReactionsFor, showActionsFor]) // Added showActionsFor dependency

  useEffect(() => {
    if (messages.length === 0) return

    const fetchReactions = async () => {
      const messageIds = messages.map((m) => m.id).filter((id) => !id.startsWith("temp-"))
      if (messageIds.length === 0) return

      const { data } = await supabase.from("message_reactions").select("*").in("message_id", messageIds)

      if (data) {
        const grouped: Record<string, Reaction[]> = {}
        data.forEach((r) => {
          if (!grouped[r.message_id]) grouped[r.message_id] = []
          grouped[r.message_id].push(r)
        })
        setReactions(grouped)
      }
    }

    fetchReactions()

    const channel = supabase
      .channel("reactions-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => fetchReactions())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [messages, supabase])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages.length])

  const toggleReaction = async (messageId: string, reactionEmoji: string) => {
    const existingReaction = reactions[messageId]?.find((r) => r.user_id === currentUserId)

    if (existingReaction) {
      await supabase.from("message_reactions").delete().eq("id", existingReaction.id)
      if (existingReaction.reaction !== reactionEmoji) {
        await supabase.from("message_reactions").insert({
          message_id: messageId,
          user_id: currentUserId,
          reaction: reactionEmoji,
        })
        const message = messages.find((m) => m.id === messageId)
        if (message && message.sender_id !== currentUserId) {
          await sendReactionNotification(message, reactionEmoji)
        }
      }
    } else {
      await supabase.from("message_reactions").insert({
        message_id: messageId,
        user_id: currentUserId,
        reaction: reactionEmoji,
      })
      const message = messages.find((m) => m.id === messageId)
      if (message && message.sender_id !== currentUserId) {
        await sendReactionNotification(message, reactionEmoji)
      }
    }
    setShowReactionsFor(null)
    setLongPressActive(null)
    setShowActionsFor(null)
  }

  const sendReactionNotification = async (message: Message, emoji: string) => {
    try {
      const currentMember = members.find((m) => m.user_id === currentUserId)
      const senderName = currentMember?.profile?.display_name || "مستخدم"

      await fetch("/api/notifications/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: message.id,
          emoji,
          recipientId: message.sender_id,
          groupId: message.group_id,
        }),
      })
    } catch (error) {
      console.error("Error sending reaction notification:", error)
    }
  }

  const getReplyPreview = (replyToId: string) => {
    const originalMessage = messages.find((m) => m.id === replyToId)
    if (!originalMessage) return null
    return {
      senderName: originalMessage.sender?.display_name || "مستخدم",
      content: originalMessage.content?.substring(0, 50) + (originalMessage.content?.length > 50 ? "..." : ""),
    }
  }

  const getGroupedReactions = (messageId: string) => {
    const messageReactions = reactions[messageId] || []
    const grouped: Record<string, { count: number; users: string[]; hasCurrentUser: boolean }> = {}

    // Track unique users per reaction
    const usersByReaction: Record<string, Set<string>> = {}

    messageReactions.forEach((r) => {
      if (!usersByReaction[r.reaction]) {
        usersByReaction[r.reaction] = new Set()
      }
      // Only count if user hasn't already reacted with this emoji
      if (!usersByReaction[r.reaction].has(r.user_id)) {
        usersByReaction[r.reaction].add(r.user_id)

        if (!grouped[r.reaction]) {
          grouped[r.reaction] = { count: 0, users: [], hasCurrentUser: false }
        }
        grouped[r.reaction].count++
        const member = members.find((m) => m.user_id === r.user_id)
        grouped[r.reaction].users.push(member?.profile?.display_name || "مستخدم")
        if (r.user_id === currentUserId) {
          grouped[r.reaction].hasCurrentUser = true
        }
      }
    })

    return grouped
  }

  const handleDeleteClick = (messageId: string) => {
    setMessageToDelete(messageId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (messageToDelete && onDelete) {
      onDelete(messageToDelete)
    }
    setDeleteDialogOpen(false)
    setMessageToDelete(null)
  }

  const handleTranslate = async (messageId: string, content: string) => {
    if (translatedMessages[messageId]) {
      // Toggle off translation
      setTranslatedMessages((prev) => {
        const updated = { ...prev }
        delete updated[messageId]
        return updated
      })
      return
    }

    setTranslatingMessages((prev) => new Set([...prev, messageId]))

    try {
      const response = await fetch("/api/ai/translate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          targetLang: content.match(/[a-zA-Z]/) ? "ar" : "en", // Auto-detect
        }),
      })

      if (response.ok) {
        const { translation } = await response.json()
        setTranslatedMessages((prev) => ({ ...prev, [messageId]: translation }))
      }
    } catch (error) {
      console.error("Translation error:", error)
    } finally {
      setTranslatingMessages((prev) => {
        const updated = new Set(prev)
        updated.delete(messageId)
        return updated
      })
    }
  }

  const renderContentWithMentions = (content: string) => {
    const mentionPattern = /@(\w+)/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = mentionPattern.exec(content)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index))
      }

      // Add mention
      const username = match[1]
      const isMentioningCurrentUser =
        members.find((m) => m.user_id === currentUserId)?.profile?.username?.toLowerCase() === username.toLowerCase() ||
        members
          .find((m) => m.user_id === currentUserId)
          ?.profile?.display_name?.replace(/\s+/g, "")
          .toLowerCase() === username.toLowerCase()

      parts.push(
        <span
          key={match.index}
          className={cn(
            "font-medium px-1 rounded",
            isMentioningCurrentUser ? "bg-primary/20 text-primary" : "bg-muted-foreground/20 text-muted-foreground",
          )}
        >
          @{username}
        </span>,
      )

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex))
    }

    return parts.length > 0 ? parts : content
  }

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    // toast.success("تم نسخ الرسالة") // Removed toast import and usage
    setShowActionsFor(null)
    setLongPressActive(null)
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (confirm("هل أنت متأكد من حذف هذه الرسالة؟")) {
      // Assuming you have a way to delete messages via Supabase, similar to how reactions are handled
      const { error } = await supabase.from("messages").delete().eq("id", messageId)
      if (error) {
        console.error("Error deleting message:", error)
        // toast.error("فشل حذف الرسالة") // Removed toast import and usage
        return
      }
      // toast.success("تم حذف الرسالة") // Removed toast import and usage
    }
    setShowActionsFor(null)
    setLongPressActive(null)
  }

  const handleEditMessage = (messageId: string) => {
    // سيتم تنفيذه لاحقاً
    // toast.info("ميزة التعديل قريباً") // Removed toast import and usage
    setShowActionsFor(null)
    setLongPressActive(null)
  }

  const handlePinMessage = async (messageId: string) => {
    // Assuming you have an 'is_pinned' and 'pinned_by'/'pinned_at' field in your messages table
    const { error } = await supabase
      .from("messages")
      .update({ is_pinned: true, pinned_by: currentUserId, pinned_at: new Date().toISOString() })
      .eq("id", messageId)
    if (error) {
      console.error("Error pinning message:", error)
      // toast.error("فشل تثبيت الرسالة") // Removed toast import and usage
      return
    }
    // toast.success("تم تثبيت الرسالة") // Removed toast import and usage
    setShowActionsFor(null)
    setLongPressActive(null)
  }

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto bg-transparent" ref={containerRef}>
        <div className="p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-16 w-full max-w-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl">💬</span>
          </div>
          <p className="text-muted-foreground text-sm">ابدأ المحادثة</p>
        </div>
      </div>
    )
  }

  const groupedMessages = messages.reduce(
    (acc, message) => {
      const date = formatDistanceToNow(new Date(message.created_at), { locale: ar })
      if (!acc[date]) {
        acc[date] = { date, messages: [] }
      }
      acc[date].messages.push(message)
      return acc
    },
    {} as Record<string, { date: string; messages: Message[] }>,
  )

  return (
    <>
      <div className="flex-1 overflow-auto bg-transparent" ref={containerRef}>
        <div className="space-y-0.5">
          {Object.values(groupedMessages).map(({ date, messages: dayMessages }) => (
            <div key={date} className="space-y-2">
              {dayMessages.map((message, index) => {
                const isOwn = message.sender_id === currentUserId
                const senderName = message.sender?.display_name || "مستخدم"
                const prevMessage = index > 0 ? dayMessages[index - 1] : null
                const isSameSenderAsPrev = prevMessage?.sender_id === message.sender_id
                const nextMessage = index < dayMessages.length - 1 ? dayMessages[index + 1] : null
                const isSameSenderAsNext = nextMessage?.sender_id === message.sender_id

                const style = layerStyles[message.layer] || layerStyles.standard
                const node = nodes.find((n) => n.id === message.node_id)

                const showAvatar = !isOwn && !isSameSenderAsPrev
                const showName = !isOwn && !isSameSenderAsPrev

                const hasImage = message.attachment_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                const isActive = activeMessageId === message.id
                const replyPreview = message.reply_to ? getReplyPreview(message.reply_to) : null

                const groupedReactions = getGroupedReactions(message.id)
                const hasReactions = Object.keys(groupedReactions).length > 0

                const isMentioned =
                  message.content &&
                  new RegExp(
                    `@(${members.find((m) => m.user_id === currentUserId)?.profile?.username}|${members.find((m) => m.user_id === currentUserId)?.profile?.display_name?.replace(/\s+/g, "")})`,
                    "i",
                  ).test(message.content)

                return (
                  <div
                    key={message.id}
                    className={cn("flex items-end gap-2 px-2 group", isOwn ? "flex-row-reverse" : "flex-row")}
                    onTouchStart={(e) => handleTouchStart(message.id, e)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchMove}
                    onMouseEnter={() => setActiveMessageId(message.id)}
                    onMouseLeave={() => {
                      setActiveMessageId(null)
                      setShowReactionsFor(null)
                    }}
                  >
                    {!isOwn && (
                      <div className="w-7 shrink-0">
                        {showAvatar ? (
                          <Avatar className="w-7 h-7 ring-2 ring-background">
                            {message.sender?.avatar_url && (
                              <AvatarImage src={message.sender.avatar_url || "/placeholder.svg"} />
                            )}
                            <AvatarFallback
                              className={cn(getAvatarColor(message.sender_id), "text-white font-bold text-[10px]")}
                            >
                              {senderName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ) : null}
                      </div>
                    )}

                    <div className={cn("max-w-[70%] flex flex-col", isOwn && "items-end")}>
                      {showName && (
                        <div className="flex items-center gap-2 mb-0.5 px-1">
                          <Link href={`/chat/profile/${message.sender_id}`} className="hover:underline">
                            <span className="text-[11px] font-medium text-muted-foreground cursor-pointer">
                              {senderName}
                            </span>
                          </Link>
                          {message.sender?.active_title && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] h-4 px-1.5 gap-0.5"
                              style={{
                                backgroundColor: `${message.sender.active_title.color}20`,
                                borderColor: message.sender.active_title.color,
                                color: message.sender.active_title.color,
                              }}
                            >
                              <span>{message.sender.active_title.icon}</span>
                              <span>{message.sender.active_title.name_ar}</span>
                            </Badge>
                          )}
                        </div>
                      )}

                      {replyPreview && (
                        <div
                          className={cn(
                            "flex items-center gap-1.5 mb-1 px-2 py-1 rounded-lg border-r-2 border-primary bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors",
                            isOwn && "border-r-0 border-l-2",
                          )}
                          onClick={() => {
                            // Implement scroll to the replied message if needed
                          }}
                        >
                          <Reply className="w-3 h-3 text-primary shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-medium text-primary truncate">{replyPreview.senderName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{replyPreview.content}</p>
                          </div>
                        </div>
                      )}

                      <div
                        className={cn(
                          "relative group/message rounded-2xl px-3 py-2 text-sm transition-all duration-200",
                          isOwn
                            ? [
                                style.ownBg,
                                "text-white shadow-md",
                                "rounded-2xl",
                                isSameSenderAsPrev && !isSameSenderAsNext && "rounded-tr-md", // Adjusted for potentially missing nextMessage logic
                                !isSameSenderAsPrev && isSameSenderAsNext && "rounded-br-md", // Adjusted for potentially missing nextMessage logic
                                isSameSenderAsPrev && isSameSenderAsNext && "rounded-r-md", // Adjusted for potentially missing nextMessage logic
                              ]
                            : [
                                style.bg,
                                "rounded-2xl",
                                isSameSenderAsPrev && !isSameSenderAsNext && "rounded-tl-md", // Adjusted for potentially missing nextMessage logic
                                !isSameSenderAsPrev && isSameSenderAsNext && "rounded-bl-md", // Adjusted for potentially missing nextMessage logic
                                isSameSenderAsPrev && isSameSenderAsNext && "rounded-l-md", // Adjusted for potentially missing nextMessage logic
                                isMentioned && "ring-2 ring-primary/30", // Highlight mentioned messages
                              ],
                          message.layer === "shadow" && "italic opacity-80",
                          isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                        )}
                      >
                        {node && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "absolute -bottom-2 text-[8px] px-1 py-0 h-3.5 gap-0.5 bg-background shadow-sm",
                              isOwn ? "right-2" : "left-2",
                            )}
                            style={{ borderColor: node.color, color: node.color }}
                          >
                            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: node.color }} />
                            {node.title}
                          </Badge>
                        )}

                        {hasImage && (
                          <div className="mb-1.5 -mx-1 -mt-0.5">
                            <img
                              src={message.attachment_url || "/placeholder.svg"}
                              alt="مرفق"
                              className="max-w-full max-h-56 rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setLightboxImage(message.attachment_url || null)}
                            />
                          </div>
                        )}

                        {message.content && message.content !== "📷 صورة" && (
                          <p className="text-[14px] whitespace-pre-wrap break-words leading-snug">
                            {translatedMessages[message.id] || renderContentWithMentions(message.content)}
                          </p>
                        )}

                        {translatedMessages[message.id] && (
                          <div className="mt-1 p-2 bg-muted/50 rounded-lg border border-border/50 text-sm">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                              <Languages className="w-3 h-3" />
                              <span>ترجمة</span>
                            </div>
                            {translatedMessages[message.id]}
                          </div>
                        )}

                        <div className={cn("flex items-center gap-1 mt-0.5", isOwn ? "justify-start" : "justify-end")}>
                          <span className={cn("text-[10px]", isOwn ? "text-white/60" : "text-muted-foreground/70")}>
                            {formatDistanceToNow(new Date(message.created_at), { locale: ar })}
                          </span>
                          {isOwn && <CheckCheck className="w-3 h-3 text-white/60" />}
                          {style.icon && <span className="text-[9px] opacity-50">{style.icon}</span>}
                        </div>
                      </div>

                      {hasReactions && (
                        <div className="flex flex-wrap gap-1 mt-1 px-1">
                          {Object.entries(groupedReactions).map(([emoji, data]) => (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(message.id, emoji)}
                              className={cn(
                                "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-all",
                                data.hasCurrentUser
                                  ? "bg-primary/20 border-primary text-primary font-medium"
                                  : "bg-muted border-border hover:bg-muted/80",
                              )}
                              title={data.users.join(", ")}
                            >
                              <span>{emoji}</span>
                              {data.count > 1 && <span className="text-[10px]">{data.count}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {isActive && (
                      <div
                        className={cn(
                          "absolute top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity animate-in fade-in duration-150",
                          isOwn ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1",
                        )}
                      >
                        {onReply && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={() => onReply(message)}
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {message.content && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={() => handleTranslate(message.id, message.content!)}
                            disabled={translatingMessages.has(message.id)}
                          >
                            {translatingMessages.has(message.id) ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Languages className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        )}
                        {isOwn && onDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full text-destructive hover:text-destructive"
                            onClick={() => handleDeleteClick(message.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <div ref={messagesEndRef} className="h-1" />

        {lightboxImage && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <img
              src={lightboxImage || "/placeholder.svg"}
              alt="صورة مكبرة"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف الرسالة</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذه الرسالة؟ لا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  )
}
