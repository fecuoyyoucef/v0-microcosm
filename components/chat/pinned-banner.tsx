"use client"

import React, { useEffect, useRef, useState } from "react"
import { Pin, PinOff, X, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Message } from "@/lib/types"
import { cn } from "@/lib/utils"

interface PinnedBannerProps {
  /** Pinned messages sorted ASC by pinned_at (oldest first, newest last). */
  pinnedMessages: Message[]
  groupId?: string
  isAdmin: boolean
  onJump: (messageId: string) => void
  onUnpin: (message: Message) => void
  onShowAll: () => void
}

/**
 * Telegram-style sticky pinned banner.
 *
 * Behavior:
 *  - Displays the *newest* pinned message first.
 *  - Tap → jumps to the currently shown pin, then cycles to the next older one.
 *  - Long-press → opens the full "all pinned messages" list.
 *  - Counter "(N/total)" + vertical segmented progress bar mirrors Telegram.
 *  - X dismisses the banner for the current session only (per group).
 *  - Admin: extra unpin shortcut for the currently shown pin.
 */
export function PinnedBanner({
  pinnedMessages,
  groupId,
  isAdmin,
  onJump,
  onUnpin,
  onShowAll,
}: PinnedBannerProps) {
  const total = pinnedMessages.length

  const [dismissed, setDismissed] = useState(false)
  // Index into `pinnedMessages` (oldest=0, newest=total-1). Defaults to newest.
  const [currentIndex, setCurrentIndex] = useState(Math.max(0, total - 1))

  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const wasLongPress = useRef(false)
  const lastNewestIdRef = useRef<string | null>(null)

  // Restore session dismissal on mount / group switch.
  useEffect(() => {
    if (!groupId || typeof window === "undefined") return
    const key = `dismissed_pinned_${groupId}`
    setDismissed(sessionStorage.getItem(key) === "true")
  }, [groupId])

  // When pins change: keep showing the newest, and reset dismissal if a brand-new pin arrives.
  useEffect(() => {
    if (total === 0) {
      lastNewestIdRef.current = null
      return
    }
    const newest = pinnedMessages[total - 1]
    if (newest && newest.id !== lastNewestIdRef.current) {
      if (lastNewestIdRef.current !== null && groupId) {
        // A new pin arrived after the user dismissed → bring banner back.
        sessionStorage.removeItem(`dismissed_pinned_${groupId}`)
        setDismissed(false)
      }
      lastNewestIdRef.current = newest.id
      setCurrentIndex(total - 1)
    } else if (currentIndex >= total) {
      setCurrentIndex(total - 1)
    }
  }, [pinnedMessages, total, groupId, currentIndex])

  if (dismissed || total === 0) return null

  const safeIndex = Math.min(Math.max(currentIndex, 0), total - 1)
  const current = pinnedMessages[safeIndex]
  if (!current) return null

  // Position counter: newest shown = "1/total"
  const positionFromNewest = total - 1 - safeIndex // 0 = newest
  const counterLabel = total > 1 ? ` (${positionFromNewest + 1}/${total})` : ""

  const handleTap = () => {
    if (wasLongPress.current) {
      wasLongPress.current = false
      return
    }
    onJump(current.id)
    if (total > 1) {
      // Move to the next older pin; wrap to newest after the oldest.
      setCurrentIndex((i) => (i - 1 + total) % total)
    }
  }

  const handlePointerDown = () => {
    wasLongPress.current = false
    longPressTimer.current = setTimeout(() => {
      wasLongPress.current = true
      onShowAll()
    }, 500)
  }

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleDismiss = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation()
    if (groupId && typeof window !== "undefined") {
      sessionStorage.setItem(`dismissed_pinned_${groupId}`, "true")
    }
    setDismissed(true)
  }

  const handleShowAll = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation()
    onShowAll()
  }

  const handleUnpinClick = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation()
    onUnpin(current)
  }

  /* --------------------------------------------------------- */
  /*  Vertical segmented progress bar (Telegram-style)          */
  /* --------------------------------------------------------- */
  const renderSegmentedBar = () => {
    if (total <= 1) {
      return <div className="w-[3px] rounded-full bg-primary self-stretch" />
    }
    const maxSegments = 5
    const segments = Math.min(total, maxSegments)
    // Map currentIndex (0 oldest .. total-1 newest) to a segment where 0 = top (newest).
    const activeSegment = Math.min(
      segments - 1,
      Math.floor(((total - 1 - safeIndex) * segments) / total),
    )
    return (
      <div className="flex flex-col gap-[2px] self-stretch shrink-0 py-0.5 w-[3px]">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-full transition-colors",
              i === activeSegment ? "bg-primary" : "bg-primary/30",
            )}
          />
        ))}
      </div>
    )
  }

  // Strip leading "📁 مرفقات" or empty content for the preview.
  const preview =
    current.content && current.content.trim() && current.content.trim() !== "📁 مرفقات"
      ? current.content.trim()
      : current.attachments && (current.attachments as unknown[]).length > 0
        ? "مرفقات"
        : "رسالة مثبتة"

  const senderLabel =
    current.sender?.display_name || current.sender?.username || ""

  return (
    <div className="sticky top-0 z-20 px-3 pt-2">
      <div
        role="button"
        tabIndex={0}
        onClick={handleTap}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handleTap()
          }
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onPointerCancel={cancelLongPress}
        aria-label={`رسالة مثبتة${counterLabel}. اضغط للانتقال إليها، اضغط مطولاً لعرض الكل.`}
        className={cn(
          "w-full backdrop-blur-md bg-card/85 border border-border/60 rounded-2xl shadow-sm overflow-hidden",
          "active:scale-[0.99] transition-transform cursor-pointer outline-none",
          "focus-visible:ring-2 focus-visible:ring-primary/50",
        )}
      >
        <div className="flex items-stretch gap-2.5 px-2.5 py-2 min-h-[52px]">
          {renderSegmentedBar()}

          <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
            <div className="text-[11px] font-bold text-primary flex items-center gap-1 leading-none tabular-nums">
              <Pin className="h-3 w-3 fill-current" />
              <span>رسالة مثبتة{counterLabel}</span>
              {senderLabel && (
                <>
                  <span className="text-muted-foreground/60 mx-0.5" aria-hidden>
                    ·
                  </span>
                  <span className="text-muted-foreground font-medium truncate max-w-[120px]">
                    {senderLabel}
                  </span>
                </>
              )}
            </div>
            <div className="text-[13px] text-foreground truncate font-medium leading-snug">
              {preview}
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShowAll}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="جميع الرسائل المثبتة"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
            >
              <List className="h-4 w-4" />
            </Button>
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleUnpinClick}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label="إلغاء تثبيت هذه الرسالة"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
              >
                <PinOff className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="إخفاء الشريط"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
