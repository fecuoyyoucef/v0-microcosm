"use client"

import React from "react"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Copy, Edit2, Trash2, Languages, Check, Pin, Reply } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"
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
  setMessages: (messages: Message[]) => void
}

const MessageItem = ({ message, isOwn }: { message: Message; isOwn: boolean }) => {
  return (
    <div
      className={cn("group relative", "py-3 px-4 hover:bg-muted/40 transition-colors rounded-lg", isOwn && "ms-auto")}
    >
      {/* Message content */}
      <div className="flex gap-3">
        <Avatar className="h-9 w-9 shrink-0"></Avatar>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sm"></span>
            <span className="text-xs text-muted-foreground"></span>
          </div>

          <div className="text-sm leading-relaxed break-words"></div>
        </div>
      </div>
    </div>
  )
}

export const MessageList = React.memo(function MessageList({
  messages,
  groupId,
  currentUserId,
  isLoading,
  messagesEndRef,
  onReplySelect,
  onEditSelect,
  onMessageDeleted,
  setMessages,
}: MessageListProps) {
  const router = useRouter()
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

  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const touchStartPos = useRef<{ x: number; y: number } | null>(null)
  const isTouchMoving = useRef(false)

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
    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", selectedMessage.id)
        .eq("sender_id", currentUserId)

      if (!error) {
        toast({ title: "تم حذف الرسالة" })
        onMessageDeleted?.(selectedMessage.id)
      } else {
        toast({ title: "فشل الحذف", variant: "destructive" })
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

  const handlePinMessage = async () => {
    if (!selectedMessage) return

    try {
      const response = await fetch("/api/messages/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: selectedMessage.id,
          userId: currentUserId,
          groupId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || "خطأ في تثبيت الرسالة")
        return
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === selectedMessage.id
            ? { ...m, is_pinned: !m.is_pinned, pinned_at: !m.is_pinned ? new Date().toISOString() : null }
            : m,
        ),
      )
      setShowActionSheet(false)
      setSelectedMessage(null)
    } catch (error) {
      console.error("Error pinning message:", error)
      alert("خطأ في تثبيت الرسالة")
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
        body: JSON.stringify({
          text: selectedMessage.content,
          targetLang: /[\u0600-\u06FF]/.test(selectedMessage.content) ? "en" : "ar",
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
      // Check if reaction exists
      const { data: existing } = await supabase
        .from("message_reactions")
        .select("id")
        .eq("message_id", messageId)
        .eq("user_id", currentUserId)
        .eq("reaction", emoji)
        .single()

      if (existing) {
        // Remove reaction
        await supabase.from("message_reactions").delete().eq("id", existing.id)
        setLocalReactions((prev) => ({
          ...prev,
          [messageId]: (prev[messageId] || []).filter((r) => !(r.user_id === currentUserId && r.reaction === emoji)),
        }))
        toast({ title: `تم إزالة ${emoji}` })
      } else {
        // Add reaction
        const { data: newReaction } = await supabase
          .from("message_reactions")
          .insert({
            message_id: messageId,
            user_id: currentUserId,
            reaction: emoji,
          })
          .select()
          .single()

        if (newReaction) {
          setLocalReactions((prev) => ({
            ...prev,
            [messageId]: [...(prev[messageId] || []), { id: newReaction.id, user_id: currentUserId, reaction: emoji }],
          }))
          toast({ title: `تم إضافة ${emoji}` })
        }
      }
    } catch {
      toast({ title: "فشل التفاعل", variant: "destructive" })
    }
  }

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

    // If moved more than 10px, cancel long press
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

  // Helper function to render attachments
  // const renderAttachments = (attachments: any[], isOwn: boolean) => {
  //   if (!attachments || !Array.isArray(attachments) || attachments.length === 0) return null
  //
  //   return (
  //     <div className="mt-2 space-y-2">
  //       {attachments.map((attachment: any, index: number) => {
  //         if (attachment.type === "image") {
  //           return (
  //             <div key={index} className="relative rounded-lg overflow-hidden max-w-[250px]">
  //               <img
  //                 src={attachment.url || "/placeholder.svg"}
  //                 alt={attachment.name || "صورة"}
  //                 className="rounded-lg object-cover max-h-[200px] w-auto"
  //                 loading="lazy"
  //               />
  //             </div>
  //           )
  //         } else {
  //           // Document file (pdf, docx, md)
  //           const getFileIcon = () => {
  //             const ext = attachment.name?.split(".").pop()?.toLowerCase()
  //             if (ext === "pdf") return <FileText className="w-5 h-5 text-red-500" />
  //             if (ext === "docx" || ext === "doc") return <FileText className="w-5 h-5 text-blue-500" />
  //             if (ext === "md") return <FileText className="w-5 h-5 text-gray-500" />
  //             return <File className="w-5 h-5" />
  //           }
  //
  //           return (
  //             <a
  //               key={index}
  //               href={attachment.url}
  //               target="_blank"
  //               rel="noopener noreferrer"
  //               download={attachment.name}
  //               className={cn(
  //                 "flex items-center gap-2 p-2 rounded-lg border max-w-[250px]",
  //                 isOwn ? "bg-white/10 border-white/20" : "bg-muted border-border",
  //               )}
  //             >
  //               {getFileIcon()}
  //               <div className="flex-1 min-w-0">
  //                 <p className={cn("text-xs font-medium truncate", isOwn ? "text-white" : "text-foreground")}>
  //                   {attachment.name}
  //                 </p>
  //                 {attachment.size && (
  //                   <p className={cn("text-[10px]", isOwn ? "text-white/70" : "text-muted-foreground")}>
  //                     {(attachment.size / 1024).toFixed(1)} KB
  //                   </p>
  //                 )}
  //               </div>
  //               <Download className={cn("w-4 h-4 shrink-0", isOwn ? "text-white/70" : "text-muted-foreground")} />
  //             </a>
  //           )
  //         }
  //       })}
  //     </div>
  //   )
  // }

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

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>لا توجد رسائل بعد. ابدأ المحادثة!</p>
      </div>
    )
  }

  const pinnedMessages = messages.filter((m) => m.is_pinned)
  const regularMessages = messages.filter((m) => !m.is_pinned)

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {pinnedMessages.length > 0 && (
          <div className="mb-4 border-b pb-4">
            <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <Pin className="h-4 w-4" />
              <span>رسائل مثبتة</span>
            </div>
            {pinnedMessages.map((message) => {
              const isOwn = message.sender_id === currentUserId
              const layer = message.layer || "standard"
              const style = layerStyles[layer] || layerStyles.standard
              const dbReactions = (message as any).reactions || []
              const localMsgReactions = localReactions[message.id] || []
              const allReactions = [...dbReactions]
              localMsgReactions.forEach((lr) => {
                if (!allReactions.some((r) => r.id === lr.id)) {
                  allReactions.push(lr)
                }
              })
              const translation = translations[message.id]
              const isTranslating = translatingId === message.id
              const replyToMessage = (message as any).reply_to_message

              return (
                <MessageItem key={message.id} message={message} isOwn={isOwn}>
                  {!isOwn && (message.sender?.display_name || message.sender?.username) && (
                    <Link
                      href={`/chat/profile/${message.sender_id}`}
                      className="text-xs font-medium text-foreground px-2 hover:underline hover:text-primary transition-colors"
                    >
                      {message.sender?.display_name || message.sender?.username}
                    </Link>
                  )}

                  {message.reply_to && (message as any).reply_preview ? (
                    <div className="text-xs bg-muted/50 rounded px-2 py-1 mb-1 opacity-70 border-r-2 border-primary">
                      <span className="font-medium">{(message as any).reply_preview.user_name}</span>
                      <p className="truncate max-w-[200px]">{(message as any).reply_preview.content}</p>
                    </div>
                  ) : message.reply_to && replyToMessage ? (
                    <div className="text-xs bg-muted/50 rounded px-2 py-1 mb-1 opacity-70 border-r-2 border-primary">
                      <span className="font-medium">{replyToMessage.sender?.display_name || "مستخدم"}</span>
                      <p className="truncate max-w-[200px]">{replyToMessage.content}</p>
                    </div>
                  ) : null}

                  <div
                    className={cn("rounded-2xl px-4 py-2 break-words", isOwn ? style.ownBg + " text-white" : style.bg)}
                  >
                    {message.content && message.content !== "📁 مرفقات" && (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                    {message.attachments && <AttachmentsGallery attachments={message.attachments} isOwn={isOwn} />}
                    {isTranslating && <p className="text-xs opacity-70 mt-1">جاري الترجمة...</p>}
                    {translation && <p className="text-xs opacity-70 mt-1 border-t pt-1">{translation}</p>}
                  </div>

                  <div className={cn("flex items-center gap-1 px-2", isOwn ? "justify-end" : "justify-start")}>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: ar })}
                    </span>
                    {message.updated_at && message.updated_at !== message.created_at && (
                      <Badge variant="outline" className="text-[8px] px-1 py-0">
                        معدّلة
                      </Badge>
                    )}
                    <Pin className="h-3 w-3 text-primary fill-primary" />
                    {layer !== "standard" && <span className="text-[10px]">{style.icon}</span>}
                  </div>

                  {allReactions.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {quickReactions.map((emoji) => {
                        const count = allReactions.filter((r) => r.reaction === emoji).length
                        if (count === 0) return null
                        const hasReacted = allReactions.some((r) => r.reaction === emoji && r.user_id === currentUserId)
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(message.id, emoji)}
                            className={cn(
                              "text-xs px-1.5 py-0.5 rounded-full transition-all",
                              hasReacted ? "bg-primary/20 border border-primary/50" : "bg-muted/50",
                            )}
                          >
                            {emoji} {count}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </MessageItem>
              )
            })}
          </div>
        )}

        {regularMessages.map((message) => {
          const isOwn = message.sender_id === currentUserId
          const layer = message.layer || "standard"
          const style = layerStyles[layer] || layerStyles.standard
          const dbReactions = (message as any).reactions || []
          const localMsgReactions = localReactions[message.id] || []
          const allReactions = [...dbReactions]
          localMsgReactions.forEach((lr) => {
            if (!allReactions.some((r) => r.id === lr.id)) {
              allReactions.push(lr)
            }
          })
          const translation = translations[message.id]
          const isTranslating = translatingId === message.id
          const replyToMessage = (message as any).reply_to_message

          return (
            <MessageItem key={message.id} message={message} isOwn={isOwn}>
              {!isOwn && (message.sender?.display_name || message.sender?.username) && (
                <Link
                  href={`/chat/profile/${message.sender_id}`}
                  className="text-xs font-medium text-foreground px-2 hover:underline hover:text-primary transition-colors"
                >
                  {message.sender?.display_name || message.sender?.username}
                </Link>
              )}

              {message.reply_to && (message as any).reply_preview ? (
                <div className="text-xs bg-muted/50 rounded px-2 py-1 mb-1 opacity-70 border-r-2 border-primary">
                  <span className="font-medium">{(message as any).reply_preview.user_name}</span>
                  <p className="truncate max-w-[200px]">{(message as any).reply_preview.content}</p>
                </div>
              ) : message.reply_to && replyToMessage ? (
                <div className="text-xs bg-muted/50 rounded px-2 py-1 mb-1 opacity-70 border-r-2 border-primary">
                  <span className="font-medium">{replyToMessage.sender?.display_name || "مستخدم"}</span>
                  <p className="truncate max-w-[200px]">{replyToMessage.content}</p>
                </div>
              ) : null}

              <div className={cn("rounded-2xl px-4 py-2 break-words", isOwn ? style.ownBg + " text-white" : style.bg)}>
                {message.content && message.content !== "📁 مرفقات" && (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
                {message.attachments && <AttachmentsGallery attachments={message.attachments} isOwn={isOwn} />}
                {isTranslating && <p className="text-xs opacity-70 mt-1">جاري الترجمة...</p>}
                {translation && <p className="text-xs opacity-70 mt-1 border-t pt-1">{translation}</p>}
              </div>

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

              {allReactions.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-1">
                  {quickReactions.map((emoji) => {
                    const count = allReactions.filter((r) => r.reaction === emoji).length
                    if (count === 0) return null
                    const hasReacted = allReactions.some((r) => r.reaction === emoji && r.user_id === currentUserId)
                    return (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(message.id, emoji)}
                        className={cn(
                          "text-xs px-1.5 py-0.5 rounded-full transition-all",
                          hasReacted ? "bg-primary/20 border border-primary/50" : "bg-muted/50",
                        )}
                      >
                        {emoji} {count}
                      </button>
                    )
                  })}
                </div>
              )}
            </MessageItem>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Action Sheet with Quick Reactions */}
      <Sheet open={showActionSheet} onOpenChange={setShowActionSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="text-right">خيارات الرسالة</SheetTitle>
          </SheetHeader>

          <div className="flex justify-center gap-2 py-4 border-b">
            {quickReactions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  if (selectedMessage) {
                    handleReaction(selectedMessage.id, emoji)
                    setShowActionSheet(false)
                  }
                }}
                className="text-2xl hover:scale-125 transition-transform p-2"
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="py-4 space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-end gap-2"
              onClick={() => selectedMessage && handleCopy(selectedMessage.content, selectedMessage.id)}
            >
              نسخ النص
              {copiedId === selectedMessage?.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>

            <Button variant="ghost" className="w-full justify-end gap-2" onClick={handleReply}>
              رد
              <Reply className="h-4 w-4" />
            </Button>

            <Button variant="ghost" className="w-full justify-end gap-2" onClick={handleTranslate}>
              ترجمة
              <Languages className="h-4 w-4" />
            </Button>

            {selectedMessage?.sender_id === currentUserId && (
              <Button variant="ghost" className="w-full justify-end gap-2" onClick={handlePinMessage}>
                {selectedMessage?.is_pinned ? "إلغاء التثبيت" : "تثبيت"}
                <Pin className="h-4 w-4" />
              </Button>
            )}

            {selectedMessage?.sender_id === currentUserId && (
              <Button variant="ghost" className="w-full justify-end gap-2" onClick={handleEdit}>
                تعديل
                <Edit2 className="h-4 w-4" />
              </Button>
            )}

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
