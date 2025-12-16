"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { formatDistanceToNow } from "date-fns"
import { ar, enUS, fr } from "date-fns/locale"
import { useLanguage } from "@/lib/language-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trash2, ReplyIcon, Languages, Copy, MoreHorizontal } from "lucide-react"
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
import { cn } from "@/lib/utils"
import Image from "next/image"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { GroupMember } from "@/lib/types"

const reactionStickers = [
  { id: "star", url: "/images/4.webp", label: "نجمة" },
  { id: "badge", url: "/images/5.webp", label: "شارة" },
  { id: "circle", url: "/images/2.webp", label: "دائرة" },
  { id: "sword", url: "/images/3.webp", label: "سيف" },
  { id: "simple", url: "/images/1.webp", label: "بسيط" },
]

type Message = {}

interface Reaction {
  id: string
  message_id: string
  user_id: string
  reaction: string
  created_at: string
}

interface MessageListProps {
  messages: Message[]
  currentUserId: string
  members: GroupMember[]
  onReply: (message: Message) => void
  onDeleteMessage: (messageId: string) => void
  groupId: string
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

function MessageList({ messages, currentUserId, members, onReply, onDeleteMessage, groupId }: MessageListProps) {
  const supabase = createBrowserClient()
  const { language, t } = useLanguage()
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({})
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null)
  const [showReactionsFor, setShowReactionsFor] = useState<string | null>(null)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null)
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({})
  const [translatingMessages, setTranslatingMessages] = useState<Set<string>>(new Set())

  const [longPressActive, setLongPressActive] = useState<string | null>(null)
  const [showBottomSheet, setShowBottomSheet] = useState<string | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartY = useRef<number>(0)

  const handleTouchStart = (messageId: string, e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
    }

    longPressTimerRef.current = setTimeout(() => {
      setLongPressActive(messageId)
      setShowBottomSheet(messageId)
      // Haptic feedback
      if ("vibrate" in navigator) {
        navigator.vibrate(50)
      }
    }, 400)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const moveY = Math.abs(e.touches[0].clientY - touchStartY.current)
    if (moveY > 10 && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setShowBottomSheet(null)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  const handleTranslateMessage = async (messageId: string, content: string) => {
    setShowBottomSheet(null)

    if (translatedMessages[messageId]) {
      const newTranslated = { ...translatedMessages }
      delete newTranslated[messageId]
      setTranslatedMessages(newTranslated)
      return
    }

    setTranslatingMessages(new Set(translatingMessages).add(messageId))

    try {
      const response = await fetch("/api/ai/translate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, targetLanguage: language }),
      })
      const data = await response.json()

      if (data.translation) {
        setTranslatedMessages({ ...translatedMessages, [messageId]: data.translation })
      }
    } catch (error) {
      console.error("Translation failed:", error)
    } finally {
      const newTranslating = new Set(translatingMessages)
      newTranslating.delete(messageId)
      setTranslatingMessages(newTranslating)
    }
  }

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
    setShowBottomSheet(null)
    setLongPressActive(null)
  }

  const getReplyPreview = (replyToId: string) => {
    const originalMessage = messages.find((m) => m.id === replyToId)
    if (!originalMessage) return null
    return {
      senderName: originalMessage.sender?.display_name || t("user"),
      content: originalMessage.content?.substring(0, 50) + (originalMessage.content?.length > 50 ? "..." : ""),
    }
  }

  const getGroupedReactions = (messageId: string) => {
    const messageReactions = reactions[messageId] || []
    const grouped: Record<string, { count: number; users: string[]; hasCurrentUser: boolean }> = {}
    const usersByReaction: Record<string, Set<string>> = {}

    messageReactions.forEach((r) => {
      if (!usersByReaction[r.reaction]) {
        usersByReaction[r.reaction] = new Set()
      }
      if (!usersByReaction[r.reaction].has(r.user_id)) {
        usersByReaction[r.reaction].add(r.user_id)

        if (!grouped[r.reaction]) {
          grouped[r.reaction] = { count: 0, users: [], hasCurrentUser: false }
        }
        grouped[r.reaction].count++
        const member = members.find((m) => m.user_id === r.user_id)
        grouped[r.reaction].users.push(member?.profile?.display_name || t("user"))
        if (r.user_id === currentUserId) {
          grouped[r.reaction].hasCurrentUser = true
        }
      }
    })

    return grouped
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showBottomSheet && !event.target!.closest(".bottom-sheet-container")) {
        setShowBottomSheet(null)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showBottomSheet])

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
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages.length])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4" dir={language === "ar" ? "rtl" : "ltr"}>
      {messages.map((message) => {
        const isOwn = message.sender_id === currentUserId
        const sender = members.find((m) => m.user_id === message.sender_id)
        const groupedReactions = getGroupedReactions(message.id)
        const hasReactions = Object.keys(groupedReactions).length > 0
        const translatedContent = translatedMessages[message.id]
        const isTranslating = translatingMessages.has(message.id)

        return (
          <div
            key={message.id}
            ref={(el) => {
              messageRefs.current[message.id] = el
            }}
            className={cn("flex gap-2", isOwn ? "flex-row-reverse" : "flex-row")}
            onTouchStart={(e) => handleTouchStart(message.id, e)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {!isOwn && (
              <Link href={`/chat/profile/${message.sender_id}`} className="shrink-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={sender?.profile?.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback>{sender?.profile?.display_name?.[0] || "U"}</AvatarFallback>
                </Avatar>
              </Link>
            )}

            <div className={cn("flex flex-col max-w-[75%]", isOwn ? "items-end" : "items-start")}>
              {!isOwn && (
                <Link
                  href={`/chat/profile/${message.sender_id}`}
                  className="text-xs text-muted-foreground mb-1 px-1 hover:underline"
                >
                  {sender?.profile?.display_name || t("user")}
                </Link>
              )}

              <div className="relative">
                {message.reply_to && (
                  <div className="mb-1 px-3 py-1.5 rounded-lg bg-muted/50 border-l-2 border-primary/50 text-xs">
                    {getReplyPreview(message.reply_to)}
                  </div>
                )}

                <div
                  className={cn(
                    "px-4 py-2 rounded-2xl break-words whitespace-pre-wrap",
                    isOwn ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm",
                  )}
                >
                  {message.content}

                  {translatedContent && (
                    <div className="mt-2 pt-2 border-t border-primary-foreground/20 text-sm italic opacity-90">
                      {translatedContent}
                    </div>
                  )}

                  {isTranslating && <div className="mt-2 text-xs opacity-70">{t("translating")}...</div>}
                </div>

                {message.attachment_url && message.attachment_type === "image" && (
                  <div
                    className="mt-2 relative rounded-lg overflow-hidden max-w-xs cursor-pointer"
                    onClick={() => setLightboxImage(message.attachment_url!)}
                  >
                    <Image
                      src={message.attachment_url || "/placeholder.svg"}
                      alt="Attachment"
                      width={300}
                      height={300}
                      className="object-cover"
                    />
                  </div>
                )}

                {hasReactions && (
                  <div className="flex flex-wrap gap-1 mt-1 px-1">
                    {Object.entries(groupedReactions).map(([reactionId, data]) => {
                      const sticker = reactionStickers.find((s) => s.id === reactionId)
                      return (
                        <button
                          key={reactionId}
                          onClick={() => toggleReaction(message.id, reactionId)}
                          className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-all",
                            data.hasCurrentUser
                              ? "bg-primary/20 border-primary ring-2 ring-primary/30"
                              : "bg-background/80 border-border hover:bg-muted/80",
                          )}
                          title={data.users.join(", ")}
                        >
                          {sticker && (
                            <Image
                              src={sticker.url || "/placeholder.svg"}
                              alt={sticker.label}
                              width={16}
                              height={16}
                              className="object-contain"
                            />
                          )}
                          {data.count > 1 && <span className="text-[10px] font-medium">{data.count}</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="text-[10px] text-muted-foreground mt-0.5 px-1">
                {formatDistanceToNow(new Date(message.created_at), {
                  addSuffix: true,
                  locale: language === "ar" ? ar : language === "fr" ? fr : enUS,
                })}
              </div>
            </div>
          </div>
        )
      })}

      {showBottomSheet && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setShowBottomSheet(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300">
            {(() => {
              const message = messages.find((m) => m.id === showBottomSheet)
              if (!message) return null
              const isOwn = message.sender_id === currentUserId

              return (
                <div className="p-4 space-y-4">
                  {/* Reactions bar */}
                  <div className="flex items-center justify-center gap-2 pb-4 border-b">
                    <div className="flex items-center gap-2 bg-muted/50 rounded-full p-2">
                      {reactionStickers.map((sticker) => (
                        <button
                          key={sticker.id}
                          onClick={() => toggleReaction(message.id, sticker.id)}
                          className="w-12 h-12 rounded-full hover:bg-background transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
                        >
                          <Image
                            src={sticker.url || "/placeholder.svg"}
                            alt={sticker.label}
                            width={40}
                            height={40}
                            className="object-contain"
                          />
                        </button>
                      ))}
                      <button
                        onClick={() => setShowBottomSheet(null)}
                        className="w-10 h-10 rounded-full hover:bg-background transition-all flex items-center justify-center"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-4 gap-3 pb-2">
                    <button
                      onClick={() => {
                        onReply(message)
                        setShowBottomSheet(null)
                      }}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <ReplyIcon className="w-5 h-5 text-blue-500" />
                      </div>
                      <span className="text-xs text-center">{t("reply")}</span>
                    </button>

                    <button
                      onClick={() => handleCopyMessage(message.content)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                        <Copy className="w-5 h-5 text-green-500" />
                      </div>
                      <span className="text-xs text-center">{t("copy")}</span>
                    </button>

                    <button
                      onClick={() => handleTranslateMessage(message.id, message.content)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                        <Languages className="w-5 h-5 text-purple-500" />
                      </div>
                      <span className="text-xs text-center">{t("translate")}</span>
                    </button>

                    {isOwn && (
                      <button
                        onClick={() => {
                          setMessageToDelete(message.id)
                          setDeleteDialogOpen(true)
                          setShowBottomSheet(null)
                        }}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                          <Trash2 className="w-5 h-5 text-red-500" />
                        </div>
                        <span className="text-xs text-center">{t("delete")}</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })()}
          </div>
        </>
      )}

      <div ref={messagesEndRef} />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete_message")}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirm_delete_message")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDeleteMessage(messageToDelete!)
                setDeleteDialogOpen(false)
                setMessageToDelete(null)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <Image
            src={lightboxImage || "/placeholder.svg"}
            alt="صورة مكبرة"
            width={800}
            height={600}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  )
}

export { MessageList }
export default MessageList
