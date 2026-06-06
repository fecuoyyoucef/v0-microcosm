"use client"

import { useEffect, useState } from "react"
import { Bell, LogIn, BellOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Meeting } from "@/lib/types"

/**
 * Full-screen, alarm-clock-style overlay shown 5 minutes before a meeting.
 * It is intentionally loud visually (pulsing bell, high contrast) and offers
 * two clear actions: enter the cell (primary) or silence the alarm.
 */
export function MeetingAlarmOverlay({
  meeting,
  groupName,
  onEnter,
  onDismiss,
}: {
  meeting: Meeting
  groupName: string
  onEnter: () => void
  onDismiss: () => void
}) {
  const [countdown, setCountdown] = useState<string>("")

  // Live countdown to the meeting start.
  useEffect(() => {
    const tick = () => {
      const diff = new Date(meeting.starts_at).getTime() - Date.now()
      if (diff <= 0) {
        setCountdown("بدأ الآن")
        return
      }
      const mins = Math.floor(diff / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setCountdown(`بعد ${mins}:${secs.toString().padStart(2, "0")}`)
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [meeting.starts_at])

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="تنبيه اجتماع"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 bg-background/95 px-6 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-6 text-center">
        <span className="relative flex h-28 w-28 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/40" />
          <span className="relative inline-flex h-28 w-28 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Bell className="h-12 w-12 animate-pulse" aria-hidden="true" />
          </span>
        </span>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium uppercase tracking-wide text-accent">تنبيه اجتماع</p>
          <h2 className="text-balance text-3xl font-bold text-foreground">{meeting.title}</h2>
          <p className="text-lg text-muted-foreground">{groupName}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{countdown}</p>
          {meeting.duration_min ? (
            <p className="text-sm text-muted-foreground">المدة: {meeting.duration_min} دقيقة</p>
          ) : null}
        </div>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <Button size="lg" className="h-14 w-full gap-2 text-base" onClick={onEnter}>
          <LogIn className="h-5 w-5" aria-hidden="true" />
          الدخول إلى الخلية
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-12 w-full gap-2 bg-transparent text-base"
          onClick={onDismiss}
        >
          <BellOff className="h-5 w-5" aria-hidden="true" />
          إيقاف المنبه
        </Button>
      </div>
    </div>
  )
}
