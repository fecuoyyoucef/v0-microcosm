import { createServiceClient } from "@/lib/supabase/server"
import { sendNotification } from "@/lib/notifications-server"
import { type NextRequest, NextResponse } from "next/server"

// Shared secret with the pg_cron job (see scripts/031_meetings.sql). Kept inline
// to avoid requiring a new env var; matches the Authorization bearer the cron sends.
const DISPATCH_TOKEN = "meet_dispatch_cron_synaptic_2026"

// POST /api/meetings/dispatch
// Invoked every minute by pg_cron via pg_net. Drives meeting lifecycle:
//   1. reminder  : ~5 min before start  -> meeting_reminder push (starts alarm)
//   2. start     : at start time        -> status=active + meeting_started push
//   3. end       : at start+duration    -> status=ended  + meeting_ended push
// Each transition is guarded by a *_sent_at flag so it fires exactly once even
// if the cron overlaps or retries.
export async function POST(request: NextRequest) {
  // Accept either the cron's bearer token or the platform CRON_SECRET.
  const auth = request.headers.get("authorization")
  if (auth !== `Bearer ${DISPATCH_TOKEN}` && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const svc = createServiceClient()
    const now = Date.now()
    const nowIso = new Date(now).toISOString()

    // Pull every meeting that could still need an action.
    const { data: meetings, error } = await svc
      .from("meetings")
      .select("id, group_id, created_by, title, starts_at, duration_min, status, reminder_sent_at, started_sent_at, ended_sent_at")
      .in("status", ["scheduled", "active"])

    if (error) {
      console.error("[Meetings] dispatch fetch error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let reminders = 0
    let starts = 0
    let ends = 0

    for (const m of meetings ?? []) {
      const start = new Date(m.starts_at).getTime()
      if (Number.isNaN(start)) continue
      const minsToStart = (start - now) / 60000

      // 3) END: duration elapsed.
      if (m.duration_min && m.status === "active" && !m.ended_sent_at) {
        const end = start + m.duration_min * 60000
        if (now >= end) {
          await svc.from("meetings").update({ status: "ended", ended_sent_at: nowIso }).eq("id", m.id)
          await sendNotification({
            userIds: await groupUserIds(svc, m.group_id),
            type: "meeting_ended",
            title: "انتهى الاجتماع",
            body: m.title,
            groupId: m.group_id,
            data: { meeting_id: m.id, meeting_event: "ended" },
          })
          ends++
          continue
        }
      }

      // 2) START: start time reached.
      if (m.status === "scheduled" && !m.started_sent_at && now >= start) {
        await svc.from("meetings").update({ status: "active", started_sent_at: nowIso }).eq("id", m.id)
        await sendNotification({
          userIds: await groupUserIds(svc, m.group_id),
          type: "meeting_started",
          title: "بدأ الاجتماع الآن",
          body: m.title,
          groupId: m.group_id,
          data: { meeting_id: m.id, meeting_event: "started" },
        })
        starts++
        continue
      }

      // 1) REMINDER: within the 5-minute window before start (and not past start).
      if (m.status === "scheduled" && !m.reminder_sent_at && minsToStart <= 5 && minsToStart > 0) {
        await svc.from("meetings").update({ reminder_sent_at: nowIso }).eq("id", m.id)
        await sendNotification({
          userIds: await groupUserIds(svc, m.group_id),
          type: "meeting_reminder",
          title: "اجتماع بعد 5 دقائق",
          body: m.title,
          groupId: m.group_id,
          data: { meeting_id: m.id, meeting_event: "reminder", starts_at: m.starts_at },
        })
        reminders++
      }
    }

    return NextResponse.json({ ok: true, reminders, starts, ends, scanned: meetings?.length ?? 0 })
  } catch (e) {
    console.error("[Meetings] dispatch exception:", e)
    return NextResponse.json({ error: "dispatch failed" }, { status: 500 })
  }
}

async function groupUserIds(
  svc: ReturnType<typeof createServiceClient>,
  groupId: string,
): Promise<string[]> {
  const { data } = await svc.from("group_members").select("user_id").eq("group_id", groupId)
  return (data ?? []).map((r) => r.user_id as string)
}
