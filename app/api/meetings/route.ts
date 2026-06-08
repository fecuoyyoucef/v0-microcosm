import { createClient, createServiceClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// POST /api/meetings  -> admin schedules a meeting for a group.
// Body: { groupId, title?, startsAt (ISO), durationMin? }
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { groupId, title, startsAt, durationMin } = await request.json()

    if (!groupId || !startsAt) {
      return NextResponse.json({ error: "groupId and startsAt are required" }, { status: 400 })
    }

    const start = new Date(startsAt)
    if (Number.isNaN(start.getTime())) {
      return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 })
    }
    // Must be in the future (allow a small 10s grace for clock skew).
    if (start.getTime() < Date.now() - 10_000) {
      return NextResponse.json({ error: "وقت الاجتماع يجب أن يكون في المستقبل" }, { status: 400 })
    }

    // Verify the caller is an admin of this group.
    const { data: membership } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (!membership || membership.role !== "admin") {
      return NextResponse.json({ error: "فقط المسؤول يمكنه تحديد اجتماع" }, { status: 403 })
    }

    const duration =
      typeof durationMin === "number" && durationMin > 0 ? Math.min(Math.round(durationMin), 1440) : null

    // Service client for the insert so we don't depend on RLS evaluation order.
    const svc = createServiceClient()
    const { data: meeting, error } = await svc
      .from("meetings")
      .insert({
        group_id: groupId,
        created_by: user.id,
        title: (title && String(title).trim()) || "اجتماع",
        starts_at: start.toISOString(),
        duration_min: duration,
        status: "scheduled",
      })
      .select()
      .single()

    if (error) {
      console.error("[Meetings] create error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ meeting })
  } catch (error) {
    console.error("[Meetings] create exception:", error)
    return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 })
  }
}
