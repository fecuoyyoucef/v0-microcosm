"use client"

import React from "react"
import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Copy, Edit2, Trash2, Languages, Check, Pin, Reply } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"
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

interface MessageListProps {
  messages: Message[]
  groupId?: string
  currentUserId: string
  members?: GroupMember[]
  isLoading: boolean
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  nodes?: ConversationNode[]
  onReplySelect?: (message: Message) => void
  onEditSelect?: (message: Message) => void
  onMessageDeleted?: (messageId: string) => void
}

interface Reaction {
  id: string
  message_id: string
  user_id: string
  reaction: string
  created_at: string
}

export const MessageList = React.memo(function MessageList({
  messages,
  currentUserId,
  isLoading,
  messagesEndRef,
  nodes = [],
  onReplySelect,
  onEditSelect,
  onMessageDeleted,
}: MessageListProps) {
  const supabase = createClient()

  const [showActionSheet, setShowActionSheet] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [translatingId, setTranslatingId] = useState<string | null>(null)
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({})

  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

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
      toast({ title: "اختر ردك على الرسالة" })
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
    try {
      const response = await fetch("/api/messages/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: selectedMessage.id }),
      })

      if (response.ok) {
        toast({ title: "تم حذف الرسالة" })
        onMessageDeleted?.(selectedMessage.id)
      } else {
        const data = await response.json()
        toast({ title: data.error || "فشل الحذف", variant: "destructive" })
      }
    } catch {
      toast({ title: "فشل الحذف", variant: "destructive" })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
      setShowActionSheet(false)
      setSelectedMessage(null)
    }
  }

  const handlePin = async () => {
    if (!selectedMessage) return

    try {
      const response = await fetch("/api/messages/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: selectedMessage.id }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({ title: data.pinned ? "تم التثبيت" : "تم إلغاء التثبيت" })
      } else {
        toast({ title: "فشلت العملية", variant: "destructive" })
      }
    } catch {
      toast({ title: "فشلت العملية", variant: "destructive" })
    } finally {
      setShowActionSheet(false)
    }
  }

  const handleTranslate = async () => {
    if (!selectedMessage) return

    setTranslatingId(selectedMessage.id)
    setShowActionSheet(false)

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selectedMessage.content, targetLang: "en" }),
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
      const response = await fetch("/api/messages/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, reaction: emoji, userId: currentUserId }),
      })

      if (response.ok) {
        const data = await response.json()
        // Update local reactions
        if (data.action === "added") {
          setReactions((prev) => ({
            ...prev,
            [messageId]: [
              ...(prev[messageId] || []),
              {
                id: data.reactionId,
                message_id: messageId,
                user_id: currentUserId,
                reaction: emoji,
                created_at: new Date().toISOString(),
              },
            ],
          }))
        } else {
          setReactions((prev) => ({
            ...prev,
            [messageId]: (prev[messageId] || []).filter((r) => !(r.user_id === currentUserId && r.reaction === emoji)),
          }))
        }
      }
    } catch {
      toast({ title: "فشل التفاعل", variant: "destructive" })
    }
  }

  const handleLongPressStart = (message: Message) => {
    longPressTimer.current = setTimeout(() => {
      setSelectedMessage(message)
      setShowActionSheet(true)
    }, 500)
  }

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={cn("flex gap-3", i % 2 === 0 ? "justify-start" : "justify-end")}>
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-16 w-48 rounded-2xl" />
          </div>
        ))}
      </div>
    )
  }

  // Empty state
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>لا توجد رسائل بعد. ابدأ المحادثة!</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => {
          const isOwn = message.sender_id === currentUserId
          const layer = message.layer || "standard"
          const style = layerStyles[layer] || layerStyles.standard
          const messageReactions = reactions[message.id] || []
          const translation = translations[message.id]
          const isTranslating = translatingId === message.id

          return (
            <div
              key={message.id}
              className={cn("flex gap-2 group", isOwn ? "flex-row-reverse" : "flex-row")}
              onTouchStart={() => handleLongPressStart(message)}
              onTouchEnd={handleLongPressEnd}
              onTouchCancel={handleLongPressEnd}
              onContextMenu={(e) => {
                e.preventDefault()
                setSelectedMessage(message)
                setShowActionSheet(true)
              }}
            >
              {/* Avatar */}
              {!isOwn && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={message.sender?.avatar_url || undefined} />
                  <AvatarFallback className={getAvatarColor(message.sender_id)}>
                    {message.sender?.username?.[0]?.toUpperCase() || "؟"}
                  </AvatarFallback>
                </Avatar>
              )}

              {/* Message bubble */}
              <div className={cn("max-w-[75%] space-y-1", isOwn ? "items-end" : "items-start")}>
                {/* Sender name */}
                {!isOwn && message.sender?.username && (
                  <span className="text-xs text-muted-foreground px-2">{message.sender.username}</span>
                )}

                {/* Reply reference */}
                {message.reply_to && (
                  <div className="text-xs bg-muted/50 rounded px-2 py-1 mb-1 opacity-70">↩️ رد على رسالة</div>
                )}

                {/* Bubble */}
                <div
                  className={cn("rounded-2xl px-4 py-2 break-words", isOwn ? style.ownBg + " text-white" : style.bg)}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                  {/* Translation */}
                  {isTranslating && <p className="text-xs opacity-70 mt-1">جاري الترجمة...</p>}
                  {translation && <p className="text-xs opacity-70 mt-1 border-t pt-1">{translation}</p>}
                </div>

                {/* Time and status */}
                <div className={cn("flex items-center gap-1 px-2", isOwn ? "justify-end" : "justify-start")}>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: ar })}
                  </span>
                  {message.updated_at && message.updated_at !== message.created_at && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0">
                      معدّلة
                    </Badge>
                  )}
                  {layer !== "standard" && <span className="text-[10px]">{style.icon}</span>}
                </div>

                {/* Quick Reactions bar - only show on hover/select */}
                {selectedMessage?.id === message.id && (
                  <div className="flex gap-1 mt-1">
                    {quickReactions.map((emoji) => {
                      const count = messageReactions.filter((r) => r.reaction === emoji).length
                      const hasReacted = messageReactions.some(
                        (r) => r.reaction === emoji && r.user_id === currentUserId,
                      )

                      return (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(message.id, emoji)}
                          className={cn(
                            "text-sm px-1 rounded transition-all hover:scale-110",
                            hasReacted ? "bg-primary/20" : "opacity-50 hover:opacity-100",
                          )}
                        >
                          {emoji}
                          {count > 0 && <span className="text-[10px] ml-0.5">{count}</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Action Sheet */}
      <Sheet open={showActionSheet} onOpenChange={setShowActionSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="text-right">خيارات الرسالة</SheetTitle>
          </SheetHeader>

          <div className="py-4 space-y-2">
            {/* Copy */}
            <Button
              variant="ghost"
              className="w-full justify-end gap-2"
              onClick={() => selectedMessage && handleCopy(selectedMessage.content, selectedMessage.id)}
            >
              نسخ النص
              {copiedId === selectedMessage?.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>

            {/* Reply */}
            <Button variant="ghost" className="w-full justify-end gap-2" onClick={handleReply}>
              رد
              <Reply className="h-4 w-4" />
            </Button>

            {/* Translate */}
            <Button variant="ghost" className="w-full justify-end gap-2" onClick={handleTranslate}>
              ترجمة
              <Languages className="h-4 w-4" />
            </Button>

            {/* Pin */}
            <Button variant="ghost" className="w-full justify-end gap-2" onClick={handlePin}>
              تثبيت
              <Pin className="h-4 w-4" />
            </Button>

            {/* Edit - only for own messages */}
            {selectedMessage?.sender_id === currentUserId && (
              <Button variant="ghost" className="w-full justify-end gap-2" onClick={handleEdit}>
                تعديل
                <Edit2 className="h-4 w-4" />
              </Button>
            )}

            {/* Delete - only for own messages */}
            {selectedMessage?.sender_id === currentUserId && (
              <Button
                variant="ghost"
                className="w-full justify-end gap-2 text-destructive hover:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                حذف
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">حذف الرسالة</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
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
