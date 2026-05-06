"use client"

import React from "react"
import { useState, useRef, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Copy, Edit2, Trash2, Languages, Check, Pin, Reply, MessageSquareText, Loader2 } from "lucide-react"
import Link from "next/link"
import type { Message, GroupMember, ConversationNode } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { AttachmentsGallery } from "./attachments-gallery"

/* ------------------------------------------------------------------ */
/*  Brand-aligned avatar palette (matches home page & header gradients) */
/* ------------------------------------------------------------------ */
const avatarColors = [
  "bg-gradient-to-br from-[oklch(0.55_0.13_195)] to-[oklch(0.62_0.15_165)]",
  "bg-gradient-to-br from-[oklch(0.78_0.16_70)] to-[oklch(0.68_0.18_35)]",
  "bg-gradient-to-br from-[oklch(0.62_0.15_165)] to-[oklch(0.55_0.13_195)]",
  "bg-gradient-to-br from-[oklch(0.5_0.12_240)] to-[oklch(0.55_0.13_195)]",
  "bg-gradient-to-br from-[oklch(0.68_0.18_35)] to-[oklch(0.78_0.16_70)]",
  "bg-gradient-to-br from-[oklch(0.55_0.13_195)] to-[oklch(0.5_0.12_240)]",
]

const getAvatarColor = (str: string) => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

const quickReactions = ["👍", "❤️", "😂", "😮", "😢", "🔥"]

/* ------------------------------------------------------------------ */
/*  Layer accent — subtle left-bar instead of emoji icons               */
/* ------------------------------------------------------------------ */
const layerStyles: Record<
  string,
  { ownBg: string; otherBg: string; accent: string; label: string }
> = {
  upper: {
    ownBg: "bg-accent text-accent-foreground",
    otherBg: "bg-accent/15 text-foreground",
    accent: "before:bg-accent",
    label: "مهم",
  },
  standard: {
    ownBg: "bg-primary text-primary-foreground",
    otherBg: "bg-muted text-foreground",
    accent: "",
    label: "",
  },
  shadow: {
    ownBg: "bg-muted-foreground/40 text-foreground",
    otherBg: "bg-muted/50 text-muted-foreground",
    accent: "before:bg-muted-foreground/40",
    label: "هامش",
  },
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                              */
/* ------------------------------------------------------------------ */

// Telegram-style HH:mm
const formatTime = (date: Date) => {
  const h = date.getHours().toString().padStart(2, "0")
  const m = date.getMinutes().toString().padStart(2, "0")
  return `${h}:${m}`
}

const formatDateLabel = (date: Date) => {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

  if (isSameDay(date, today)) return "اليوم"
  if (isSameDay(date, yesterday)) return "أمس"

  // Within last week
  const weekAgo = new Date()
  weekAgo.setDate(today.getDate() - 7)
  if (date > weekAgo) {
    return date.toLocaleDateString("ar", { weekday: "long" })
  }

  return date.toLocaleDateString("ar", { day: "numeric", month: "long", year: "numeric" })
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/* ------------------------------------------------------------------ */
/*  Grouping logic                                                       */
/*  Two messages are in the same "burst" when:                           */
/*    - same sender                                                       */
/*    - same layer                                                        */
/*    - within 60s                                                        */
/*    - same day                                                          */
/* ------------------------------------------------------------------ */
type EnrichedMessage = Message & {
  _showAvatar: boolean
  _showName: boolean
  _isLastInGroup: boolean
  _showDateSeparator: boolean
  _dateLabel?: string
}

function enrichMessages(messages: Message[]): EnrichedMessage[] {
  return messages.map((msg, i) => {
    const prev = messages[i - 1]
    const next = messages[i + 1]
    const created = new Date(msg.created_at)
    const prevCreated = prev ? new Date(prev.created_at) : null
    const nextCreated = next ? new Date(next.created_at) : null

    const sameLayerAsPrev = prev && (prev.layer || "standard") === (msg.layer || "standard")
    const sameSenderAsPrev = prev && prev.sender_id === msg.sender_id
    const closeToPrev = prevCreated && created.getTime() - prevCreated.getTime() < 60_000
    const sameDayAsPrev = prevCreated && isSameDay(prevCreated, created)

    const sameLayerAsNext = next && (next.layer || "standard") === (msg.layer || "standard")
    const sameSenderAsNext = next && next.sender_id === msg.sender_id
    const closeToNext = nextCreated && nextCreated.getTime() - created.getTime() < 60_000
    const sameDayAsNext = nextCreated && isSameDay(created, nextCreated)

    const isFirstInGroup = !sameSenderAsPrev || !closeToPrev || !sameDayAsPrev || !sameLayerAsPrev
    const isLastInGroup = !sameSenderAsNext || !closeToNext || !sameDayAsNext || !sameLayerAsNext

    const showDateSeparator = !prev || !sameDayAsPrev
    const dateLabel = showDateSeparator ? formatDateLabel(created) : undefined

    return {
      ...msg,
      _showAvatar: isLastInGroup,
      _showName: isFirstInGroup,
      _isLastInGroup: isLastInGroup,
      _showDateSeparator: showDateSeparator,
      _dateLabel: dateLabel,
    }
  })
}

/* ------------------------------------------------------------------ */
/*  Component                                                            */
/* ------------------------------------------------------------------ */
interface MessageListProps {
  messages: Message[]
  groupId?: string
  currentUserId: string
  members?: GroupMember[]
  isLoading: boolean
  isLoadingMore?: boolean
  hasMoreMessages?: boolean
  onLoadMore?: () => void
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  nodes?: ConversationNode[]
  onReplySelect?: (message: Message) => void
  onEditSelect?: (message: Message) => void
  onMessageDeleted?: (messageId: string) => void
  setMessages?: React.Dispatch<React.SetStateAction<Message[]>>
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>
  translationLanguage?: "ar" | "en" | "fr"
  isAdmin?: boolean
}

export const MessageList = React.memo(function MessageList({
  messages,
  groupId,
  currentUserId,
  isLoading,
  isLoadingMore = false,
  hasMoreMessages = false,
  onLoadMore,
  messagesEndRef,
  onReplySelect,
  onEditSelect,
  onMessageDeleted,
  setMessages,
  scrollContainerRef,
  translationLanguage = "ar",
  isAdmin = false,
}: MessageListProps) {
  const supabase = createClient()

  const [showActionSheet, setShowActionSheet] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [translatingId, setTranslatingId] = useState<string | null>(null)
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [localReactions, setLocalReactions] = useState<
    Record<string, Array<{ id: string; user_id: string; reaction: string }>>
  >({})
  const [collapsedPinned, setCollapsedPinned] = useState(true)

  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const touchStartPos = useRef<{ x: number; y: number } | null>(null)
  const isTouchMoving = useRef(false)
  // Stable ref so the scroll handler always reads the latest values without
  // being re-registered on every render.
  const loadMoreRef = useRef({ hasMoreMessages, isLoadingMore, onLoadMore })
  React.useEffect(() => {
    loadMoreRef.current = { hasMoreMessages, isLoadingMore, onLoadMore }
  })

  // Attach a scroll listener to the container once. Fires loadMore when the
  // user scrolls within 120 px of the top edge (oldest messages direction).
  React.useEffect(() => {
    const container = scrollContainerRef?.current
    if (!container) return

    const handleScroll = () => {
      const { hasMoreMessages, isLoadingMore, onLoadMore } = loadMoreRef.current
      if (!hasMoreMessages || isLoadingMore || !onLoadMore) return
      // scrollTop ≈ 0 means we are at the very top; 120 px threshold gives
      // a comfortable early trigger before the user bounces off the edge.
      if (container.scrollTop <= 120) {
        onLoadMore()
      }
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    return () => container.removeEventListener("scroll", handleScroll)
    // Only re-attach when the container itself changes, not on every render.
  }, [scrollContainerRef])

  /* Split & enrich */
  const { pinnedMessages, regularEnriched, latestPinned } = useMemo(() => {
    const pinned = messages.filter((m) => m.is_pinned)
    const regular = messages.filter((m) => !m.is_pinned)
    return {
      pinnedMessages: pinned,
      regularEnriched: enrichMessages(regular),
      latestPinned: pinned[pinned.length - 1] || null,
    }
  }, [messages])

  /* Actions */
  const handleCopy = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedId(messageId)
      setTimeout(() => setCopiedId(null), 2000)
      toast({ title: "تم النسخ" })
      setShowActionSheet(false)
    } catch {
      toast({ title: "فشل النسخ", variant: "destructive" })
    }
  }

  const handleReply = () => {
    if (selectedMessage && onReplySelect) {
      onReplySelect(selectedMessage)
      setShowActionSheet(false)
    }
  }

  const handleEdit = () => {
    if (selectedMessage && onEditSelect) {
      onEditSelect(selectedMessage)
      setShowActionSheet(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedMessage) return
    setIsDeleting(true)
    
    // Optimistic delete - remove message immediately from UI
    const messageToDelete = selectedMessage
    setMessages?.((prev) => prev.filter((m) => m.id !== messageToDelete.id))
    
    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageToDelete.id)
        .eq("sender_id", currentUserId)
      if (!error) {
        toast({ title: "تم حذف الرسالة" })
        onMessageDeleted?.(messageToDelete.id)
      } else {
        // Restore message on error
        setMessages?.((prev) => [...prev, messageToDelete].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ))
        toast({ title: "فشل الحذف", variant: "destructive" })
      }
    } catch {
      // Restore message on error
      setMessages?.((prev) => [...prev, messageToDelete].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ))
      toast({ title: "فشل الحذف", variant: "destructive" })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
      setShowActionSheet(false)
      setSelectedMessage(null)
    }
  }

  const handlePinMessage = async () => {
    if (!selectedMessage) return
    const messageToPin = selectedMessage
    setShowActionSheet(false)
    try {
      const response = await fetch("/api/messages/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: messageToPin.id, userId: currentUserId, groupId }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast({ title: payload?.error || "خطأ في تثبيت الرسالة", variant: "destructive" })
        return
      }
      const newPinned = payload?.pinned ?? !messageToPin.is_pinned
      setMessages?.((prev) =>
        prev.map((m) =>
          m.id === messageToPin.id
            ? { ...m, is_pinned: newPinned, pinned_at: newPinned ? new Date().toISOString() : null }
            : m,
        ),
      )
      toast({ title: newPinned ? "تم التثبيت" : "تم إلغاء التثبيت" })
      setSelectedMessage(null)
    } catch {
      toast({ title: "خطأ في تثبيت الرسالة", variant: "destructive" })
    }
  }

  const handleTranslate = async () => {
    if (!selectedMessage) return
    setTranslatingId(selectedMessage.id)
    setShowActionSheet(false)
    try {
      const targetLang = translationLanguage || "ar"
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: selectedMessage.content,
          targetLang,
        }),
      })
      if (response.ok) {
        const data = await response.json()
        setTranslations((prev) => ({ ...prev, [selectedMessage.id]: data.translated }))
        toast({ title: "تمت الترجمة" })
      } else {
        toast({ title: "فشلت الترجمة", variant: "destructive" })
      }
    } catch {
      toast({ title: "فشلت الترجمة", variant: "destructive" })
    } finally {
      setTranslatingId(null)
    }
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const { data: existing } = await supabase
        .from("message_reactions")
        .select("id")
        .eq("message_id", messageId)
        .eq("user_id", currentUserId)
        .eq("reaction", emoji)
        .single()

      if (existing) {
        await supabase.from("message_reactions").delete().eq("id", existing.id)
        setLocalReactions((prev) => ({
          ...prev,
          [messageId]: (prev[messageId] || []).filter(
            (r) => !(r.user_id === currentUserId && r.reaction === emoji),
          ),
        }))
      } else {
        const { data: newReaction } = await supabase
          .from("message_reactions")
          .insert({ message_id: messageId, user_id: currentUserId, reaction: emoji })
          .select()
          .single()
        if (newReaction) {
          setLocalReactions((prev) => ({
            ...prev,
            [messageId]: [
              ...(prev[messageId] || []),
              { id: newReaction.id, user_id: currentUserId, reaction: emoji },
            ],
          }))
        }
      }
    } catch {
      toast({ title: "فشل التفاعل", variant: "destructive" })
    }
  }

  /* Touch handlers for long-press */
  const handleTouchStart = (e: React.TouchEvent, message: Message) => {
    const touch = e.touches[0]
    touchStartPos.current = { x: touch.clientX, y: touch.clientY }
    isTouchMoving.current = false
    longPressTimer.current = setTimeout(() => {
      if (!isTouchMoving.current) {
        setSelectedMessage(message)
        setShowActionSheet(true)
      }
    }, 500)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return
    const touch = e.touches[0]
    const dx = Math.abs(touch.clientX - touchStartPos.current.x)
    const dy = Math.abs(touch.clientY - touchStartPos.current.y)
    if (dx > 10 || dy > 10) {
      isTouchMoving.current = true
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    touchStartPos.current = null
    isTouchMoving.current = false
  }

  /* ------------------------------------------------------------ */
  /*  Skeleton                                                      */
  /* ------------------------------------------------------------ */
  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={cn("flex gap-3", i % 2 === 0 ? "justify-start" : "justify-end")}>
            {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full" />}
            <Skeleton className={cn("h-12 rounded-2xl", i % 2 === 0 ? "w-48" : "w-40")} />
          </div>
        ))}
      </div>
    )
  }

  /* ------------------------------------------------------------ */
  /*  Empty state                                                    */
  /* ------------------------------------------------------------ */
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-xs">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <MessageSquareText className="w-8 h-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            ابدأ المحادثة الآن — أرسل أول رسالة في هذه الخلية.
          </p>
        </div>
      </div>
    )
  }

  /* ------------------------------------------------------------ */
  /*  Render single message                                          */
  /* ------------------------------------------------------------ */
  const renderMessage = (message: EnrichedMessage) => {
    const isOwn = message.sender_id === currentUserId
    const layer = (message.layer || "standard") as keyof typeof layerStyles
    const style = layerStyles[layer] || layerStyles.standard
    const dbReactions = (message as any).reactions || []
    const localMsgReactions = localReactions[message.id] || []
    const allReactions = [...dbReactions]
    localMsgReactions.forEach((lr) => {
      if (!allReactions.some((r) => r.id === lr.id)) allReactions.push(lr)
    })
    const translation = translations[message.id]
    const isTranslating = translatingId === message.id
    const replyToMessage = (message as any).reply_to_message
    const replyPreview = (message as any).reply_preview
    const time = formatTime(new Date(message.created_at))
    const isEdited = message.updated_at && message.updated_at !== message.created_at
    const isPinned = message.is_pinned

    /* Asymmetric corners — sharper near tail, only on last bubble in group */
    const bubbleCorners = isOwn
      ? message._isLastInGroup
        ? "rounded-2xl rounded-bl-md"
        : "rounded-2xl"
      : message._isLastInGroup
        ? "rounded-2xl rounded-br-md"
        : "rounded-2xl"

    return (
      <div
        key={message.id}
        id={`message-${message.id}`}
        className={cn(
          "flex gap-2 group/msg transition-all duration-300",
          isOwn ? "flex-row-reverse" : "flex-row",
          message._isLastInGroup ? "mb-2" : "mb-0.5",
        )}
        onTouchStart={(e) => handleTouchStart(e, message)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onContextMenu={(e) => {
          e.preventDefault()
          setSelectedMessage(message)
          setShowActionSheet(true)
        }}
      >
        {/* Avatar — only on last in group, kept space otherwise for alignment */}
        {!isOwn && (
          <div className="w-8 shrink-0 self-end">
            {message._showAvatar && (
              <Link href={`/chat/profile/${message.sender_id}`}>
                <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity ring-1 ring-border/40">
                  <AvatarImage src={message.sender?.avatar_url || undefined} />
                  <AvatarFallback className={cn("text-[11px] font-semibold text-white", getAvatarColor(message.sender_id))}>
                    {message.sender?.username?.[0]?.toUpperCase() || message.sender?.display_name?.[0]?.toUpperCase() || "؟"}
                  </AvatarFallback>
                </Avatar>
              </Link>
            )}
          </div>
        )}

        {/* Bubble column */}
        <div className={cn("flex flex-col max-w-[78%] sm:max-w-[68%]", isOwn ? "items-end" : "items-start")}>
          {/* Sender name (only first in group, non-own messages) */}
          {!isOwn && message._showName && (message.sender?.display_name || message.sender?.username) && (
            <Link
              href={`/chat/profile/${message.sender_id}`}
              className={cn(
                "text-xs font-semibold mb-1 px-2 hover:underline transition-colors",
                isOwn ? "text-primary-foreground/80" : "text-primary",
              )}
            >
              {message.sender?.display_name || message.sender?.username}
            </Link>
          )}

          <div
            className={cn(
              "relative break-words shadow-sm transition-all overflow-hidden",
              bubbleCorners,
              isOwn ? style.ownBg : style.otherBg,
              /* Layer accent bar (left side / start side) */
              layer !== "standard" &&
                "before:content-[''] before:absolute before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:start-1.5",
              style.accent,
            )}
            style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
          >
            {/* Reply preview — Telegram-style: solid start-side accent + sender + snippet */}
            {(replyPreview || replyToMessage) && (
              <button
                type="button"
                className={cn(
                  "block w-full text-start px-2.5 pt-2 pb-0 overflow-hidden min-w-0",
                  "first:rounded-t-2xl",
                )}
                onClick={() => {
                  // The actual replied-to message id lives in `message.reply_to`.
                  // `replyPreview` may also carry an `id` field, fall back to it.
                  const targetId =
                    (message as any).reply_to ||
                    replyPreview?.id ||
                    (replyPreview as any)?.message_id
                  if (targetId) {
                    const el = document.getElementById(`message-${targetId}`)
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "center" })
                      el.classList.add("ring-2", "ring-primary", "ring-offset-2")
                      setTimeout(
                        () => el.classList.remove("ring-2", "ring-primary", "ring-offset-2"),
                        1500,
                      )
                    } else {
                      toast({
                        title: "الرسالة غير محمّلة",
                        description: "اسحب للأعلى لتحميل الرسائل الأقدم.",
                      })
                    }
                  }
                }}
              >
                <div
                  className={cn(
                    "flex flex-col gap-0.5 px-2.5 py-1.5 rounded-lg overflow-hidden min-w-0",
                    "border-s-[3px]",
                    isOwn
                      ? "bg-black/10 dark:bg-white/10 border-s-primary-foreground/60"
                      : "bg-foreground/5 border-s-primary",
                  )}
                >
                  <span
                    className={cn(
                      "text-[11px] font-semibold leading-tight truncate",
                      isOwn ? "text-primary-foreground/90" : "text-primary",
                    )}
                  >
                    {replyPreview?.user_name || replyToMessage?.sender?.display_name || "مستخدم"}
                  </span>
                  <span
                    className={cn(
                      "text-xs leading-tight line-clamp-2",
                      isOwn ? "text-primary-foreground/75" : "text-muted-foreground",
                    )}
                  >
                    {replyPreview?.content || replyToMessage?.content}
                  </span>
                </div>
              </button>
            )}

            {/* Layer label at top (only for non-standard) */}
            {layer !== "standard" && style.label && (
              <div
                className={cn(
                  "px-3.5 pt-1.5 text-[10px] font-bold uppercase tracking-wider",
                  isOwn ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {style.label}
              </div>
            )}

            {/* Content */}
            {message.content && message.content !== "📁 مرفقات" && (
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap px-3.5 pt-2 pb-1.5">
                {message.content}
              </p>
            )}

            {/* Attachments */}
            {message.attachments && (
              <div className={cn(message.content && message.content !== "📁 مرفقات" ? "px-2 pb-2" : "p-2")}>
                <AttachmentsGallery attachments={message.attachments} isOwn={isOwn} />
              </div>
            )}

            {/* Translation */}
            {(isTranslating || translation) && (
              <div className={cn("mx-2 mb-1 px-2.5 py-1.5 rounded-lg text-xs", isOwn ? "bg-black/10" : "bg-foreground/5")}>
                {isTranslating ? (
                  <span className="opacity-70">جاري الترجمة...</span>
                ) : (
                  <>
                    <div className={cn("text-[10px] font-semibold mb-0.5", isOwn ? "opacity-70" : "text-primary")}>
                      ترجمة
                    </div>
                    <p className="leading-relaxed">{translation}</p>
                  </>
                )}
              </div>
            )}

            {/* Footer: time + edited + pinned + read receipt — Telegram-style inline */}
            <div
              className={cn(
                "flex items-center justify-end gap-1 px-3 pb-1.5 -mt-0.5 text-[10px] tabular-nums",
                isOwn ? "text-primary-foreground/75" : "text-muted-foreground/80",
              )}
            >
              {isEdited && <span className="italic">معدّلة</span>}
              {isPinned && <Pin className="h-2.5 w-2.5 fill-current" />}
              <span>{time}</span>
              {isOwn && (
                <svg
                  width="14"
                  height="10"
                  viewBox="0 0 14 10"
                  fill="none"
                  className="opacity-90"
                  aria-label="مرسلة"
                >
                  <path
                    d="M1 5l3 3 5-7M6 8l5-7"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </div>

          {/* Reactions — compact chips below bubble, Telegram-style */}
          {allReactions.length > 0 && (
            <div className={cn("flex gap-1 flex-wrap mt-1", isOwn ? "justify-end" : "justify-start")}>
              {quickReactions.map((emoji) => {
                const count = allReactions.filter((r) => r.reaction === emoji).length
                if (count === 0) return null
                const hasReacted = allReactions.some(
                  (r) => r.reaction === emoji && r.user_id === currentUserId,
                )
                return (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(message.id, emoji)}
                    className={cn(
                      "text-[11px] px-2 py-0.5 rounded-full transition-all border tabular-nums",
                      "hover:scale-105 active:scale-95",
                      hasReacted
                        ? "bg-primary/15 border-primary/40 text-primary font-semibold"
                        : "bg-background border-border text-foreground/80",
                    )}
                  >
                    <span className="me-1">{emoji}</span>
                    <span>{count}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick reply on hover (desktop) — invisible on mobile */}
        <button
          type="button"
          onClick={() => onReplySelect?.(message)}
          className={cn(
            "self-center hidden md:flex items-center justify-center h-7 w-7 rounded-full",
            "opacity-0 group-hover/msg:opacity-100 transition-opacity",
            "bg-background border border-border shadow-sm hover:bg-muted",
          )}
          aria-label="رد"
        >
          <Reply className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    )
  }

  /* ------------------------------------------------------------ */
  /*  Render                                                          */
  /* ------------------------------------------------------------ */
  return (
    <>
      {/* Sticky pinned banner — Telegram-style compact */}
      {latestPinned && (
        <div className="sticky top-0 z-20 px-3 pt-2">
          <button
            type="button"
            onClick={() => setCollapsedPinned((c) => !c)}
            className="w-full glass border border-border/50 rounded-2xl shadow-sm overflow-hidden"
          >
            <div className="flex items-center gap-2.5 px-3 py-2">
              <div className="h-8 w-1 rounded-full bg-primary shrink-0" />
              <div className="flex-1 min-w-0 text-start">
                <div className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                  <Pin className="h-3 w-3 fill-current" />
                  <span>رسالة مثبتة{pinnedMessages.length > 1 ? ` (${pinnedMessages.length})` : ""}</span>
                </div>
                <div className="text-xs text-foreground truncate font-medium">
                  {latestPinned.content?.slice(0, 80) || "رسالة مثبتة"}
                </div>
              </div>
            </div>
          </button>
        </div>
      )}

      <div className="flex-1 px-3 pt-3 space-y-0">
        {/* Subtle loading indicator while fetching older messages — triggered by scroll to top */}
        {isLoadingMore && (
          <div className="flex justify-center items-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/60" />
          </div>
        )}

        {regularEnriched.map((message) => (
          <React.Fragment key={message.id}>
            {message._showDateSeparator && (
              <div className="flex justify-center my-3">
                <span className="px-3 py-1 rounded-full bg-foreground/75 backdrop-blur-md text-background text-[11px] font-semibold tabular-nums shadow-sm">
                  {message._dateLabel}
                </span>
              </div>
            )}
            {renderMessage(message)}
          </React.Fragment>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Action Sheet with Quick Reactions */}
      <Sheet open={showActionSheet} onOpenChange={setShowActionSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-safe">
          <SheetHeader className="text-start">
            <SheetTitle>خيارات الرسالة</SheetTitle>
          </SheetHeader>

          <div className="flex justify-around gap-1 py-3 border-b border-border/50">
            {quickReactions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  if (selectedMessage) {
                    handleReaction(selectedMessage.id, emoji)
                    setShowActionSheet(false)
                  }
                }}
                className="text-2xl hover:scale-125 active:scale-110 transition-transform p-2 rounded-full hover:bg-muted"
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="py-2 space-y-0.5">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-11 rounded-xl"
              onClick={() => selectedMessage && handleCopy(selectedMessage.content, selectedMessage.id)}
            >
              {copiedId === selectedMessage?.id ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span>نسخ النص</span>
            </Button>

            <Button variant="ghost" className="w-full justify-start gap-3 h-11 rounded-xl" onClick={handleReply}>
              <Reply className="h-4 w-4" />
              <span>رد</span>
            </Button>

            <Button variant="ghost" className="w-full justify-start gap-3 h-11 rounded-xl" onClick={handleTranslate}>
              <Languages className="h-4 w-4" />
              <span>ترجمة</span>
            </Button>

            {isAdmin && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-11 rounded-xl"
                onClick={handlePinMessage}
              >
                <Pin className="h-4 w-4" />
                <span>{selectedMessage?.is_pinned ? "إلغاء التثبيت" : "تثبيت"}</span>
              </Button>
            )}

            {selectedMessage?.sender_id === currentUserId && (
              <>
                <Button variant="ghost" className="w-full justify-start gap-3 h-11 rounded-xl" onClick={handleEdit}>
                  <Edit2 className="h-4 w-4" />
                  <span>تعديل</span>
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-11 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span>حذف</span>
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-start">حذف الرسالة</AlertDialogTitle>
            <AlertDialogDescription className="text-start">
              هل أنت متأكد من حذف هذه الرسالة؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "جاري الحذف..." : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
})
