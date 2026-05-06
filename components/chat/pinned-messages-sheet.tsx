"use client"

import React from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Pin, PinOff } from "lucide-react"
import type { Message } from "@/lib/types"
import { cn } from "@/lib/utils"

interface PinnedMessagesSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pinnedMessages: Message[]
  isAdmin: boolean
  onJump: (messageId: string) => void
  onUnpin: (message: Message) => void
}

/* Brand-aligned avatar gradients (must match message-list) */
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

function formatRelative(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH = diffMs / 3_600_000
  const time = d.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })
  if (diffH < 24 && d.getDate() === now.getDate()) return `اليوم · ${time}`
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth())
    return `أمس · ${time}`
  return d.toLocaleDateString("ar", { day: "numeric", month: "long" }) + ` · ${time}`
}

export function PinnedMessagesSheet({
  open,
  onOpenChange,
  pinnedMessages,
  isAdmin,
  onJump,
  onUnpin,
}: PinnedMessagesSheetProps) {
  // Newest pinned first in the list.
  const sorted = [...pinnedMessages].sort((a, b) => {
    const at = a.pinned_at ? new Date(a.pinned_at).getTime() : new Date(a.created_at).getTime()
    const bt = b.pinned_at ? new Date(b.pinned_at).getTime() : new Date(b.created_at).getTime()
    return bt - at
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl pb-safe max-h-[85vh] flex flex-col p-0"
      >
        <SheetHeader className="text-start px-6 pt-6 pb-3 border-b border-border/50">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Pin className="h-4 w-4 fill-current text-primary" />
            <span>الرسائل المثبتة</span>
            <span className="text-muted-foreground font-normal tabular-nums">
              ({pinnedMessages.length})
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-2 py-1">
          {sorted.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-12">
              لا توجد رسائل مثبتة بعد.
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {sorted.map((msg) => {
                const preview =
                  msg.content && msg.content.trim() && msg.content.trim() !== "📁 مرفقات"
                    ? msg.content.trim()
                    : msg.attachments && (msg.attachments as unknown[]).length > 0
                      ? "مرفقات"
                      : "رسالة مثبتة"
                const initial =
                  msg.sender?.display_name?.[0]?.toUpperCase() ||
                  msg.sender?.username?.[0]?.toUpperCase() ||
                  "؟"
                return (
                  <li key={msg.id} className="flex items-start gap-1 px-2 py-3">
                    <button
                      type="button"
                      className={cn(
                        "flex-1 flex items-start gap-3 text-start rounded-xl px-2 py-1.5",
                        "hover:bg-muted/60 active:bg-muted transition-colors",
                      )}
                      onClick={() => {
                        onJump(msg.id)
                        onOpenChange(false)
                      }}
                    >
                      <Avatar className="h-9 w-9 ring-1 ring-border/40 shrink-0">
                        <AvatarImage src={msg.sender?.avatar_url || undefined} />
                        <AvatarFallback
                          className={cn(
                            "text-[11px] font-semibold text-white",
                            getAvatarColor(msg.sender_id),
                          )}
                        >
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs leading-tight">
                          <span className="font-semibold text-primary truncate">
                            {msg.sender?.display_name || msg.sender?.username || "مستخدم"}
                          </span>
                          <span className="text-muted-foreground tabular-nums">
                            {formatRelative(msg.pinned_at || msg.created_at)}
                          </span>
                        </div>
                        <p className="text-[13.5px] text-foreground line-clamp-2 mt-1 leading-relaxed">
                          {preview}
                        </p>
                      </div>
                    </button>

                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onUnpin(msg)}
                        aria-label="إلغاء التثبيت"
                      >
                        <PinOff className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
