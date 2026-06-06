"use client"

import { useCallback, useEffect, useState } from "react"
import { CalendarClock, Loader2, Radio, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import type { Meeting } from "@/lib/types"
import { ScheduleMeetingDialog } from "./schedule-meeting-dialog"

/**
 * Meetings panel opened from the toolbar by ANY member.
 *  - Members see a read-only list of scheduled / active / past meetings.
 *  - Admins additionally get a "schedule" action and per-meeting cancel,
 *    turning the same panel into a management view.
 * Lists update live via the meetings realtime publication.
 */
export function MeetingsSheet({
  groupId,
  isAdmin,
  open,
  onOpenChange,
}: {
  groupId: string
  isAdmin: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const supabase = createClient()
  const { toast } = useToast()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("meetings")
      .select("*")
      .eq("group_id", groupId)
      .order("starts_at", { ascending: true })
    setMeetings((data as Meeting[]) ?? [])
    setLoading(false)
  }, [supabase, groupId])

  // Initial + realtime refresh while the sheet is open.
  useEffect(() => {
    if (!open) return
    load()
    const channel = supabase
      .channel(`meetings-sheet-${groupId}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meetings", filter: `group_id=eq.${groupId}` },
        () => load(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [open, supabase, groupId, load])

  // 1s ticker for countdowns while open.
  useEffect(() => {
    if (!open) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [open])

  const handleCancel = useCallback(
    async (id: string) => {
      setCancellingId(id)
      try {
        const res = await fetch(`/api/meetings/${id}/cancel`, {
          method: "POST",
          credentials: "include",
        })
        if (!res.ok) throw new Error()
        toast({ title: "تم إلغاء الاجتماع" })
      } catch {
        toast({ title: "تعذّر إلغاء الاجتماع", variant: "destructive" })
      } finally {
        setCancellingId(null)
      }
    },
    [toast],
  )

  // Upcoming + active are the "live" meetings; ended/cancelled go to history.
  const live = meetings.filter((m) => m.status === "scheduled" || m.status === "active")
  const past = meetings.filter((m) => m.status === "ended" || m.status === "cancelled")

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-[85vw] max-w-sm p-0">
          <SheetHeader className="border-b p-4">
            <SheetTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-accent" aria-hidden="true" />
              {isAdmin ? "إدارة الاجتماعات" : "الاجتماعات المجدولة"}
            </SheetTitle>
            <SheetDescription>
              {isAdmin
                ? "حدد مواعيد الاجتماعات وأدِرها. يصل تنبيه لكل الأعضاء قبل الموعد بخمس دقائق."
                : "مواعيد اجتماعات الخلية. سيصلك تنبيه قبل الموعد بخمس دقائق."}
            </SheetDescription>
          </SheetHeader>

          {isAdmin && (
            <div className="border-b p-4">
              <Button className="w-full gap-2" onClick={() => setScheduleOpen(true)}>
                <CalendarClock className="h-4 w-4" aria-hidden="true" />
                تحديد موعد اجتماع
              </Button>
            </div>
          )}

          <ScrollArea className="h-[calc(100dvh-200px)]">
            <div className="space-y-6 p-4">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
                </div>
              ) : meetings.length === 0 ? (
                <Empty>
                  <EmptyMedia>
                    <CalendarClock className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>لا توجد اجتماعات</EmptyTitle>
                  <EmptyDescription>
                    {isAdmin ? "ابدأ بتحديد موعد اجتماع جديد." : "لم يحدد المسؤول أي اجتماع بعد."}
                  </EmptyDescription>
                </Empty>
              ) : (
                <>
                  {live.length > 0 && (
                    <section className="space-y-2">
                      <h3 className="text-xs font-medium text-muted-foreground">القادمة</h3>
                      {live.map((m) => (
                        <MeetingRow
                          key={m.id}
                          meeting={m}
                          now={now}
                          isAdmin={isAdmin}
                          cancelling={cancellingId === m.id}
                          onCancel={() => handleCancel(m.id)}
                        />
                      ))}
                    </section>
                  )}

                  {past.length > 0 && (
                    <section className="space-y-2">
                      <h3 className="text-xs font-medium text-muted-foreground">السابقة</h3>
                      {past.map((m) => (
                        <MeetingRow
                          key={m.id}
                          meeting={m}
                          now={now}
                          isAdmin={isAdmin}
                          cancelling={false}
                          onCancel={() => {}}
                        />
                      ))}
                    </section>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {isAdmin && (
        <ScheduleMeetingDialog
          groupId={groupId}
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          onScheduled={load}
        />
      )}
    </>
  )
}

function MeetingRow({
  meeting,
  now,
  isAdmin,
  cancelling,
  onCancel,
}: {
  meeting: Meeting
  now: number
  isAdmin: boolean
  cancelling: boolean
  onCancel: () => void
}) {
  const startMs = new Date(meeting.starts_at).getTime()
  const endMs = meeting.duration_min ? startMs + meeting.duration_min * 60000 : null

  const dateLabel = new Date(meeting.starts_at).toLocaleString("ar", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })

  const fmt = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000))
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    return h > 0
      ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      : `${m}:${s.toString().padStart(2, "0")}`
  }

  let badge = ""
  let badgeTone = ""
  let sub = ""
  if (meeting.status === "active") {
    badge = "جارٍ الآن"
    badgeTone = "bg-accent text-accent-foreground"
    sub = endMs ? `المتبقي ${fmt(endMs - now)}` : "اجتماع مفتوح"
  } else if (meeting.status === "scheduled") {
    badge = "قادم"
    badgeTone = "bg-primary/15 text-primary"
    sub = startMs > now ? `يبدأ بعد ${fmt(startMs - now)}` : "يبدأ الآن"
  } else if (meeting.status === "ended") {
    badge = "انتهى"
    badgeTone = "bg-muted text-muted-foreground"
    sub = meeting.duration_min ? `استغرق ${meeting.duration_min} دقيقة` : "منتهٍ"
  } else {
    badge = "أُلغي"
    badgeTone = "bg-destructive/15 text-destructive"
    sub = "تم الإلغاء"
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3",
        meeting.status === "active" ? "border-accent/40 bg-accent/5" : "border-border bg-card",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          meeting.status === "active" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {meeting.status === "active" ? (
          <Radio className="h-4 w-4 animate-pulse" aria-hidden="true" />
        ) : (
          <CalendarClock className="h-4 w-4" aria-hidden="true" />
        )}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{meeting.title}</span>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", badgeTone)}>
            {badge}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{dateLabel}</span>
        <span className="text-xs text-muted-foreground">{sub}</span>
      </div>

      {isAdmin && meeting.status === "scheduled" && (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 shrink-0 gap-1 text-xs text-muted-foreground hover:text-destructive"
          onClick={onCancel}
          disabled={cancelling}
        >
          {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          إلغاء
        </Button>
      )}
    </div>
  )
}
