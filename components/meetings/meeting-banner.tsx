"use client"

import { useEffect, useState, useCallback } from "react"
import { CalendarClock, Radio, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Meeting } from "@/lib/types"

/**
 * In-cell banner that reflects the live meeting lifecycle for ALL members:
 *  - scheduled  -> "اجتماع قادم" with a live countdown
 *  - active     -> pulsing "الخلية في حالة اجتماع" + remaining time
 *  - ended      -> brief "انتهى الاجتماع" then disappears
 * Admins additionally get a cancel action while the meeting is scheduled.
 */
export function MeetingBanner({
  groupId,
  isAdmin,
}: {
  groupId: string
  isAdmin: boolean
}) {
  const supabase = createClient()
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(async () => {
    // The single most relevant meeting: active first, else the soonest
    // upcoming, else a very recently ended one.
    const { data } = await supabase
      .from("meetings")
      .select("*")
      .eq("group_id", groupId)
      .in("status", ["scheduled", "active", "ended"])
      .order("starts_at", { ascending: true })

    const list = (data as Meeting[]) ?? []
    const active = list.find((m) => m.status === "active")
    const upcoming = list.find((m) => m.status === "scheduled")
    const justEnded = list
      .filter((m) => m.status === "ended" && m.ended_sent_at)
      .sort((a, b) => (b.ended_sent_at! > a.ended_sent_at! ? 1 : -1))[0]

    // Show an ended meeting only for ~60s after it ended.
    const recentEnded =
      justEnded && Date.now() - new Date(justEnded.ended_sent_at!).getTime() < 60_000 ? justEnded : null

    setMeeting(active ?? upcoming ?? recentEnded ?? null)
  }, [supabase, groupId])

  useEffect(() => {
    load()
  }, [load])

  // Realtime: meeting status changes flip the banner instantly for everyone.
  useEffect(() => {
    const channel = supabase
      .channel(`meeting-banner-${groupId}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meetings", filter: `group_id=eq.${groupId}` },
        () => load(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, groupId, load])

  // 1s ticker for countdowns (only while a meeting is present).
  useEffect(() => {
    if (!meeting) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [meeting])

  const handleCancel = useCallback(async () => {
    if (!meeting) return
    setCancelling(true)
    try {
      await fetch(`/api/meetings/${meeting.id}/cancel`, { method: "POST", credentials: "include" })
    } finally {
      setCancelling(false)
    }
  }, [meeting])

  if (!meeting) return null

  const startMs = new Date(meeting.starts_at).getTime()
  const endMs = meeting.duration_min ? startMs + meeting.duration_min * 60000 : null

  const fmt = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000))
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    return h > 0
      ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      : `${m}:${s.toString().padStart(2, "0")}`
  }

  let tone: "scheduled" | "active" | "ended" = "scheduled"
  let label = ""
  let detail = ""

  if (meeting.status === "ended") {
    tone = "ended"
    label = "انتهى الاجتماع"
    detail = meeting.title
  } else if (meeting.status === "active") {
    tone = "active"
    label = "الخلية في حالة اجتماع"
    detail = endMs ? `المتبقي ${fmt(endMs - now)}` : meeting.title
  } else {
    tone = "scheduled"
    label = "اجتماع قادم"
    detail = startMs > now ? `يبدأ بعد ${fmt(startMs - now)}` : "يبدأ الآن"
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b px-4 py-2 text-sm",
        tone === "active" && "border-accent/40 bg-accent/10 text-foreground",
        tone === "scheduled" && "border-border bg-muted/50 text-foreground",
        tone === "ended" && "border-border bg-muted/30 text-muted-foreground",
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          tone === "active" && "bg-accent text-accent-foreground",
          tone !== "active" && "bg-muted text-muted-foreground",
        )}
      >
        {tone === "active" ? (
          <Radio className="h-4 w-4 animate-pulse" aria-hidden="true" />
        ) : (
          <CalendarClock className="h-4 w-4" aria-hidden="true" />
        )}
      </span>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold leading-tight">{label}</span>
        <span className="truncate text-xs text-muted-foreground">
          {meeting.title}
          {detail ? ` · ${detail}` : ""}
        </span>
      </div>

      {isAdmin && meeting.status === "scheduled" && (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1 text-xs text-muted-foreground hover:text-destructive"
          onClick={handleCancel}
          disabled={cancelling}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          إلغاء
        </Button>
      )}
    </div>
  )
}
