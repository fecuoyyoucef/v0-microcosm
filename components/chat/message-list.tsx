"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { CheckCheck, Reply, Trash2, Languages, Loader2, Check } from "lucide-react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import type { Message, GroupMember, ConversationNode } from "@/lib/types"
import { cn } from "@/lib/utils"
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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
  { id: "creativity", image: "/images/4.webp", name: "ابداع" },
  { id: "challenge", image: "/images/5.webp", name: "تحدي" },
  { id: "support", image: "/images/6.webp", name: "دعم" },
]

interface MessageListProps {
  messages: Message[]
  currentUserId: string
  members: GroupMember[]
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
  members,
  isLoading,
  messagesEndRef,
  nodes,
  onReply,
  onDelete,
}: MessageListProps) {
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({})
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null)
  const [showReactionsFor, setShowReactionsFor] = useState<string | null>(null)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null)
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({})
  const [translatingMessages, setTranslatingMessages] = useState<Set<string>>(new Set())
  const supabase = createClient()
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const reactionPickerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target as Node)) {
        setShowReactionsFor(null)
      }
    }

    if (showReactionsFor) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showReactionsFor])

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

  const toggleReaction = async (messageId: string, reactionId: string) => {
    const existingReaction = reactions[messageId]?.find((r) => r.user_id === currentUserId)

    if (existingReaction) {
      await supabase.from("message_reactions").delete().eq("id", existingReaction.id)
      if (existingReaction.reaction !== reactionId) {
        await supabase.from("message_reactions").insert({
          message_id: messageId,
          user_id: currentUserId,
          reaction: reactionId,
        })
      }
    } else {
      await supabase.from("message_reactions").insert({
        message_id: messageId,
        user_id: currentUserId,
        reaction: reactionId,
      })
    }
    setShowReactionsFor(null)
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

  const handleTouchStart = (messageId: string) => {
    longPressTimer.current = setTimeout(() => {
      setActiveMessageId(messageId)
    }, 500)
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
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

  if (isLoading) {
    return (
      <div className="flex-1 p-3 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={cn("flex gap-2", i % 2 === 0 && "flex-row-reverse")}>
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-10 w-48 rounded-2xl" />
            </div>
          </div>
        ))}
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
      const date = format(new Date(message.created_at), "yyyy-MM-dd")
      if (!acc[date]) {
        acc[date] = { date, messages: [] }
      }
      acc[date].messages.push(message)
      return acc
    },
    {} as Record<string, { date: string; messages: Message[] }>,
  )

  return (
    <TooltipProvider>
      <div className="flex-1 overflow-auto bg-background" ref={containerRef}>
        <div className="space-y-0.5">
          {Object.values(groupedMessages).map(({ date, messages: dayMessages }) => (
            <div key={date} className="space-y-2">
              {dayMessages.map((message, index) => {
                const isOwn = message.sender_id === currentUserId
                const senderName = message.sender?.display_name || "مستخدم"
                const prevMessage = index > 0 ? dayMessages[index - 1] : null
                const nextMessage = index < dayMessages.length - 1 ? dayMessages[index + 1] : null
                const isSameSenderAsPrev = prevMessage?.sender_id === message.sender_id
                const isSameSenderAsNext = nextMessage?.sender_id === message.sender_id
                const isDeleted = message.deleted_at !== null

                const style = layerStyles[message.layer] || layerStyles.standard
                const node = nodes.find((n) => n.id === message.node_id)

                const showAvatar = !isOwn && !isSameSenderAsPrev
                const showName = !isOwn && !isSameSenderAsPrev

                const hasImage = message.attachment_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                const isActive = activeMessageId === message.id
                const replyPreview = message.reply_to ? getReplyPreview(message.reply_to) : null

                const groupedReactions = getGroupedReactions(message.id)
                const hasReactions = Object.keys(groupedReactions).length > 0

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "group relative flex items-end gap-2",
                      isOwn ? "flex-row-reverse" : "flex-row",
                      !isSameSenderAsPrev && "mt-3",
                    )}
                    onMouseEnter={() => setActiveMessageId(message.id)}
                    onMouseLeave={() => setActiveMessageId(null)}
                    onTouchStart={() => handleTouchStart(message.id)}
                    onTouchEnd={handleTouchEnd}
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
                        <span className="text-[11px] font-medium text-muted-foreground mb-0.5 px-1">{senderName}</span>
                      )}

                      {replyPreview && (
                        <div
                          className={cn(
                            "flex items-center gap-1.5 mb-0.5 text-[11px] text-muted-foreground",
                            isOwn && "flex-row-reverse",
                          )}
                        >
                          <div className={cn("w-0.5 h-4 rounded-full", isOwn ? "bg-white/50" : "bg-primary/50")} />
                          <span className="opacity-70">رد على {replyPreview.senderName}</span>
                        </div>
                      )}

                      <div
                        className={cn(
                          "relative px-3 py-1.5 transition-all",
                          isOwn
                            ? [
                                style.ownBg,
                                "text-white",
                                "rounded-2xl",
                                isSameSenderAsPrev && !isSameSenderAsNext && "rounded-tr-md",
                                !isSameSenderAsPrev && isSameSenderAsNext && "rounded-br-md",
                                isSameSenderAsPrev && isSameSenderAsNext && "rounded-r-md",
                              ]
                            : [
                                style.bg,
                                "rounded-2xl",
                                isSameSenderAsPrev && !isSameSenderAsNext && "rounded-tl-md",
                                !isSameSenderAsPrev && isSameSenderAsNext && "rounded-bl-md",
                                isSameSenderAsPrev && isSameSenderAsNext && "rounded-l-md",
                              ],
                          message.layer === "shadow" && "italic opacity-80",
                        )}
                      >
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
                          <p className="text-[14px] whitespace-pre-wrap break-words leading-snug">{message.content}</p>
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
                            {format(new Date(message.created_at), "p", { locale: ar })}
                          </span>
                          {isOwn && <CheckCheck className="w-3 h-3 text-white/60" />}
                          {style.icon && <span className="text-[9px] opacity-50">{style.icon}</span>}
                        </div>

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
                      </div>

                      {hasReactions && (
                        <div
                          className={cn(
                            "flex items-center gap-0.5 mt-0.5 flex-wrap",
                            isOwn ? "justify-end" : "justify-start",
                          )}
                        >
                          {Object.entries(groupedReactions).map(([reactionId, data]) => {
                            const reaction = quickReactions.find((r) => r.id === reactionId)
                            if (!reaction) return null
                            return (
                              <Tooltip key={reactionId}>
                                <TooltipTrigger asChild>
                                  <button
                                    className={cn(
                                      "flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[10px] transition-all",
                                      data.hasCurrentUser
                                        ? "bg-primary/20 ring-1 ring-primary/50"
                                        : "bg-muted/80 hover:bg-muted",
                                    )}
                                    onClick={() => toggleReaction(message.id, reactionId)}
                                  >
                                    <img
                                      src={reaction.image || "/placeholder.svg"}
                                      alt={reaction.name}
                                      className="w-3.5 h-3.5"
                                    />
                                    {data.count > 1 && <span className="text-[9px]">{data.count}</span>}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  {data.users.join("، ")}
                                </TooltipContent>
                              </Tooltip>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {isActive && !isDeleted && (
                      <div
                        className={cn(
                          "absolute top-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity animate-in fade-in duration-150",
                          isOwn ? "left-0 -translate-x-full pr-1" : "right-0 translate-x-full pl-1",
                        )}
                      >
                        <div className="relative" ref={reactionPickerRef}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full hover:bg-muted"
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowReactionsFor(showReactionsFor === message.id ? null : message.id)
                            }}
                          >
                            <span className="text-xs">😊</span>
                          </Button>

                          {showReactionsFor === message.id && (
                            <div
                              className={cn(
                                "absolute z-50 flex items-center gap-0.5 p-1.5 bg-card rounded-full shadow-lg border animate-in fade-in zoom-in-95 duration-150",
                                "bottom-full mb-1",
                                isOwn ? "right-0" : "left-0",
                              )}
                              onClick={(e) => e.stopPropagation()}
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
                                      "w-8 h-8 flex items-center justify-center rounded-full transition-all hover:scale-110 p-0.5",
                                      hasReacted ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-muted",
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

                        {onReply && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full hover:bg-muted"
                            onClick={() => onReply(message)}
                          >
                            <Reply className="w-3 h-3" />
                          </Button>
                        )}

                        {isOwn && onDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDeleteClick(message.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full hover:bg-muted"
                          onClick={() => handleTranslate(message.id, message.content)}
                          disabled={translatingMessages.has(message.id)}
                        >
                          {translatingMessages.has(message.id) ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : translatedMessages[message.id] ? (
                            <Check className="w-3 h-3 text-primary" />
                          ) : (
                            <Languages className="w-3 h-3" />
                          )}
                        </Button>
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
    </TooltipProvider>
  )
}
