"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Loader2, Reply, Forward, Copy, Trash2, MoreHorizontal, CheckCheck } from "lucide-react"
import type { Message, GroupMember, MessageLayer, ConversationNode, MessageReaction } from "@/lib/types"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

interface MessageListProps {
  messages: Message[]
  currentUserId: string
  members: GroupMember[]
  isLoading: boolean
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  nodes?: ConversationNode[]
  onReply?: (message: Message) => void
  onDelete?: (messageId: string) => void
}

const layerStyles: Record<MessageLayer, { bg: string; ownBg: string; icon: string }> = {
  upper: {
    bg: "bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-950/50 dark:to-amber-900/40 border-r-4 border-r-orange-500",
    ownBg: "bg-gradient-to-br from-orange-500 to-amber-600",
    icon: "🟠",
  },
  standard: {
    bg: "bg-gray-100 dark:bg-gray-800",
    ownBg: "bg-gradient-to-br from-blue-500 to-blue-600",
    icon: "⚪",
  },
  shadow: {
    bg: "bg-gray-50/80 dark:bg-gray-900/50 border-r-2 border-dashed border-r-gray-300 dark:border-r-gray-700",
    ownBg: "bg-gradient-to-br from-gray-400 to-gray-500",
    icon: "🔘",
  },
}

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

const quickReactions = [
  { id: "neutral", image: "/images/1.webp", name: "محايد" },
  { id: "harmony", image: "/images/2.webp", name: "توازن" },
  { id: "achievement", image: "/images/3.webp", name: "انجاز" },
  { id: "star", image: "/images/4.webp", name: "نجمة" },
  { id: "champion", image: "/images/5.webp", name: "بطل" },
]

export function MessageList({
  messages,
  currentUserId,
  members,
  isLoading,
  messagesEndRef,
  nodes = [],
  onReply,
  onDelete,
}: MessageListProps) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null)
  const [showReactionsFor, setShowReactionsFor] = useState<string | null>(null)
  const [reactions, setReactions] = useState<Record<string, MessageReaction[]>>({})
  const supabase = createClient()

  useEffect(() => {
    if (messages.length === 0) return

    const fetchReactions = async () => {
      const messageIds = messages.map((m) => m.id)
      const { data } = await supabase.from("message_reactions").select("*").in("message_id", messageIds)

      if (data) {
        const grouped: Record<string, MessageReaction[]> = {}
        data.forEach((r) => {
          if (!grouped[r.message_id]) grouped[r.message_id] = []
          grouped[r.message_id].push(r)
        })
        setReactions(grouped)
      }
    }

    fetchReactions()

    // الاشتراك في التفاعلات الجديدة
    const channel = supabase
      .channel("reactions-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const newReaction = payload.new as MessageReaction
          setReactions((prev) => ({
            ...prev,
            [newReaction.message_id]: [...(prev[newReaction.message_id] || []), newReaction],
          }))
        } else if (payload.eventType === "DELETE") {
          const oldReaction = payload.old as MessageReaction
          setReactions((prev) => ({
            ...prev,
            [oldReaction.message_id]: (prev[oldReaction.message_id] || []).filter((r) => r.id !== oldReaction.id),
          }))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [messages])

  const toggleReaction = async (messageId: string, reactionId: string) => {
    const existingReaction = reactions[messageId]?.find((r) => r.user_id === currentUserId && r.reaction === reactionId)

    if (existingReaction) {
      await supabase.from("message_reactions").delete().eq("id", existingReaction.id)

      setReactions((prev) => ({
        ...prev,
        [messageId]: prev[messageId].filter((r) => r.id !== existingReaction.id),
      }))
    } else {
      const { data, error } = await supabase
        .from("message_reactions")
        .insert({
          message_id: messageId,
          user_id: currentUserId,
          reaction: reactionId,
        })
        .select()
        .single()

      if (data && !error) {
        setReactions((prev) => ({
          ...prev,
          [messageId]: [...(prev[messageId] || []), data],
        }))
      }
    }

    setShowReactionsFor(null)
  }

  const getGroupedReactions = (messageId: string) => {
    const messageReactions = reactions[messageId] || []
    const grouped: Record<string, { count: number; hasOwn: boolean }> = {}

    messageReactions.forEach((r) => {
      if (!grouped[r.reaction]) {
        grouped[r.reaction] = { count: 0, hasOwn: false }
      }
      grouped[r.reaction].count++
      if (r.user_id === currentUserId) {
        grouped[r.reaction].hasOwn = true
      }
    })

    return grouped
  }

  const getReactionImage = (reactionId: string) => {
    const reaction = quickReactions.find((r) => r.id === reactionId)
    return reaction?.image || null
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3 p-4">
        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center">
          <span className="text-4xl">💬</span>
        </div>
        <p className="text-lg font-medium">لا توجد رسائل بعد</p>
        <p className="text-sm text-center">ابدأ المحادثة الآن!</p>
      </div>
    )
  }

  const getNodeForMessage = (nodeId: string | null) => {
    if (!nodeId) return null
    return nodes.find((n) => n.id === nodeId)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getReplyPreview = (replyToId: string) => {
    const originalMessage = messages.find((m) => m.id === replyToId)
    if (!originalMessage) return null
    return {
      sender: originalMessage.sender?.display_name || "مستخدم",
      content: originalMessage.content?.substring(0, 50) + ((originalMessage.content?.length || 0) > 50 ? "..." : ""),
    }
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="p-3 md:p-4 space-y-1 max-w-3xl mx-auto">
          {messages.map((message, index) => {
            const isOwn = message.sender_id === currentUserId
            const style = layerStyles[message.layer]
            const senderName = message.sender?.display_name || "مستخدم"
            const node = getNodeForMessage(message.node_id)

            const prevMessage = index > 0 ? messages[index - 1] : null
            const nextMessage = index < messages.length - 1 ? messages[index + 1] : null
            const isSameSenderAsPrev = prevMessage?.sender_id === message.sender_id
            const isSameSenderAsNext = nextMessage?.sender_id === message.sender_id
            const showAvatar = !isOwn && !isSameSenderAsPrev
            const showName = !isOwn && !isSameSenderAsPrev

            const isNewGroup = !isSameSenderAsPrev
            const marginTop = isNewGroup ? "mt-4" : "mt-0.5"

            const hasImage = message.attachment_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
            const isActive = activeMessageId === message.id
            const replyPreview = message.reply_to ? getReplyPreview(message.reply_to) : null

            const groupedReactions = getGroupedReactions(message.id)
            const hasReactions = Object.keys(groupedReactions).length > 0

            return (
              <div
                key={message.id}
                className={cn(
                  "group relative",
                  marginTop,
                  isOwn ? "flex flex-row-reverse" : "flex",
                  !isOwn && !showAvatar && "pr-10 md:pr-12",
                )}
                onMouseEnter={() => setActiveMessageId(message.id)}
                onMouseLeave={() => {
                  setActiveMessageId(null)
                  setShowReactionsFor(null)
                }}
                onTouchStart={() => {
                  const timer = setTimeout(() => setActiveMessageId(message.id), 500)
                  return () => clearTimeout(timer)
                }}
              >
                {/* Avatar */}
                {!isOwn && showAvatar && (
                  <Avatar className="w-8 h-8 md:w-10 md:h-10 shrink-0 mt-auto mb-1 ml-2 shadow-lg ring-2 ring-background">
                    {message.sender?.avatar_url && (
                      <AvatarImage src={message.sender.avatar_url || "/placeholder.svg"} />
                    )}
                    <AvatarFallback className={cn(getAvatarColor(message.sender_id), "text-white font-bold text-xs")}>
                      {senderName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className={cn("max-w-[75%] md:max-w-[70%] flex flex-col", isOwn && "items-end")}>
                  {/* Sender name */}
                  {showName && (
                    <span className="text-xs font-semibold text-muted-foreground mb-1 px-3">{senderName}</span>
                  )}

                  {/* Reply preview */}
                  {replyPreview && (
                    <div
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-t-xl mb-0 border-r-2 border-primary/50",
                        isOwn ? "bg-white/10 rounded-tl-xl" : "bg-muted/70 rounded-tr-xl",
                      )}
                    >
                      <span className="font-semibold text-primary text-[10px]">{replyPreview.sender}</span>
                      <p className="text-muted-foreground truncate text-[11px]">{replyPreview.content}</p>
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    className={cn(
                      "relative px-3 py-2 md:px-4 md:py-2.5 shadow-sm transition-all",
                      isOwn
                        ? [
                            style.ownBg,
                            "text-white",
                            isSameSenderAsNext ? "rounded-2xl rounded-bl-md" : "rounded-2xl rounded-bl-sm",
                            isSameSenderAsPrev && "rounded-tr-md",
                          ]
                        : [
                            style.bg,
                            isSameSenderAsNext ? "rounded-2xl rounded-br-md" : "rounded-2xl rounded-br-sm",
                            isSameSenderAsPrev && "rounded-tl-md",
                          ],
                      replyPreview && "rounded-t-none",
                      message.layer === "shadow" && "italic opacity-80",
                    )}
                  >
                    {/* Image */}
                    {hasImage && (
                      <div className="mb-2 -mx-1 -mt-1">
                        <img
                          src={message.attachment_url || "/placeholder.svg"}
                          alt="مرفق"
                          className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setLightboxImage(message.attachment_url || null)}
                        />
                      </div>
                    )}

                    {message.content && message.content !== "📷 صورة" && (
                      <p className="text-sm md:text-[15px] whitespace-pre-wrap break-words leading-relaxed">
                        {message.content}
                      </p>
                    )}

                    {/* Time and status */}
                    <div className={cn("flex items-center gap-1 mt-1", isOwn ? "justify-start" : "justify-end")}>
                      <span className={cn("text-[10px]", isOwn ? "text-white/70" : "text-muted-foreground")}>
                        {format(new Date(message.created_at), "p", { locale: ar })}
                      </span>
                      {isOwn && <CheckCheck className="w-3.5 h-3.5 text-white/70" />}
                      <span className="text-[10px] opacity-60">{style.icon}</span>
                    </div>

                    {/* Node badge */}
                    {node && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "absolute -bottom-2.5 text-[9px] px-1.5 py-0 h-4 gap-1 bg-background shadow-sm",
                          isOwn ? "right-2" : "left-2",
                        )}
                        style={{ borderColor: node.color, color: node.color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: node.color }} />
                        {node.title}
                      </Badge>
                    )}
                  </div>

                  {hasReactions && (
                    <div
                      className={cn("flex items-center gap-1 mt-1 flex-wrap", isOwn ? "justify-end" : "justify-start")}
                    >
                      {Object.entries(groupedReactions).map(([reactionId, data]) => {
                        const reactionImage = getReactionImage(reactionId)
                        return (
                          <button
                            key={reactionId}
                            onClick={() => toggleReaction(message.id, reactionId)}
                            className={cn(
                              "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors",
                              data.hasOwn
                                ? "bg-primary/20 text-primary border border-primary/30"
                                : "bg-muted hover:bg-muted/80",
                            )}
                          >
                            {reactionImage ? (
                              <img
                                src={reactionImage || "/placeholder.svg"}
                                alt=""
                                className="w-5 h-5 object-contain"
                              />
                            ) : (
                              <span>{reactionId}</span>
                            )}
                            <span className="text-[10px]">{data.count}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Quick actions */}
                {isActive && (
                  <div
                    className={cn(
                      "flex items-center gap-0.5 self-center mx-1 animate-in fade-in duration-150",
                      isOwn ? "flex-row" : "flex-row-reverse",
                    )}
                  >
                    {/* Reaction button */}
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full hover:bg-muted"
                        onClick={() => setShowReactionsFor(showReactionsFor === message.id ? null : message.id)}
                      >
                        <span className="text-sm">😊</span>
                      </Button>

                      {showReactionsFor === message.id && (
                        <div
                          className={cn(
                            "absolute z-50 flex items-center gap-1 p-2 bg-card rounded-2xl shadow-lg border animate-in fade-in zoom-in-95 duration-150",
                            "bottom-full mb-2",
                            "left-1/2 -translate-x-1/2",
                            "md:left-auto md:translate-x-0",
                            isOwn ? "md:right-0" : "md:left-0",
                          )}
                          style={{
                            maxWidth: "calc(100vw - 32px)",
                          }}
                        >
                          {quickReactions.map((reaction) => {
                            const hasReacted = reactions[message.id]?.some(
                              (r) => r.user_id === currentUserId && r.reaction === reaction.id,
                            )
                            return (
                              <button
                                key={reaction.id}
                                title={reaction.name}
                                className={cn(
                                  "w-10 h-10 flex items-center justify-center rounded-full transition-all hover:scale-110 p-1",
                                  hasReacted ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted",
                                )}
                                onClick={() => toggleReaction(message.id, reaction.id)}
                              >
                                <img
                                  src={reaction.image || "/placeholder.svg"}
                                  alt={reaction.name}
                                  className="w-full h-full object-contain"
                                />
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Reply */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full hover:bg-muted"
                      onClick={() => onReply?.(message)}
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </Button>

                    {/* More */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={isOwn ? "start" : "end"} className="w-40">
                        <DropdownMenuItem onClick={() => onReply?.(message)}>
                          <Reply className="w-4 h-4 ml-2" />
                          رد
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Forward className="w-4 h-4 ml-2" />
                          إعادة توجيه
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyToClipboard(message.content || "")}>
                          <Copy className="w-4 h-4 ml-2" />
                          نسخ
                        </DropdownMenuItem>
                        {isOwn && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => onDelete?.(message.id)}
                            >
                              <Trash2 className="w-4 h-4 ml-2" />
                              حذف
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            )
          })}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </ScrollArea>

      {/* Image Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-none">
          {lightboxImage && (
            <img
              src={lightboxImage || "/placeholder.svg"}
              alt="صورة مكبرة"
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
