"use client"

import { useState } from "react"
import { CalendarClock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

/**
 * Admin-only dialog to schedule a meeting for the current cell.
 * Collects a title, a start datetime (local), and an optional duration.
 * The browser's datetime-local value is converted to a UTC ISO string before
 * sending, so members in any timezone get the correct local alarm time.
 */
export function ScheduleMeetingDialog({
  groupId,
  open,
  onOpenChange,
  onScheduled,
}: {
  groupId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onScheduled?: () => void
}) {
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [startsAtLocal, setStartsAtLocal] = useState("")
  const [duration, setDuration] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Minimum selectable time = now (rounded to the current minute), formatted
  // for the datetime-local input in the user's local timezone.
  const minLocal = (() => {
    const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    return d.toISOString().slice(0, 16)
  })()

  const reset = () => {
    setTitle("")
    setStartsAtLocal("")
    setDuration("")
  }

  const handleSubmit = async () => {
    if (!startsAtLocal) {
      toast({ title: "حدد وقت الاجتماع", variant: "destructive" })
      return
    }
    const startsAt = new Date(startsAtLocal)
    if (Number.isNaN(startsAt.getTime())) {
      toast({ title: "وقت غير صالح", variant: "destructive" })
      return
    }
    if (startsAt.getTime() <= Date.now()) {
      toast({ title: "اختر وقتاً في المستقبل", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          groupId,
          title: title.trim() || "اجتماع",
          startsAt: startsAt.toISOString(),
          durationMin: duration ? Number.parseInt(duration, 10) : null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "تعذّر جدولة الاجتماع")
      }
      toast({ title: "تم تحديد موعد الاجتماع" })
      reset()
      onOpenChange(false)
      onScheduled?.()
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "حدث خطأ",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-accent" aria-hidden="true" />
            تحديد موعد اجتماع
          </DialogTitle>
          <DialogDescription>
            سيصل تنبيه لكل أعضاء الخلية قبل الموعد بخمس دقائق، حتى لو كان التطبيق مغلقاً.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="meeting-title">عنوان الاجتماع</Label>
            <Input
              id="meeting-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="اجتماع الفريق"
              maxLength={120}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="meeting-time">وقت البدء</Label>
            <Input
              id="meeting-time"
              type="datetime-local"
              value={startsAtLocal}
              min={minLocal}
              onChange={(e) => setStartsAtLocal(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="meeting-duration">المدة بالدقائق (اختياري)</Label>
            <Input
              id="meeting-duration"
              type="number"
              min={1}
              max={600}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="مثال: 30"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            تحديد الموعد
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
