import { createClient, createServiceClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// POST /api/meetings/[id]/cancel  -> admin cancels a scheduled/active meeting.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const svc = createServiceClient()
    const { data: meeting } = await svc.from("meetings").select("id, group_id, status").eq("id", id).maybeSingle()
    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
    }
    if (meeting.status === "ended" || meeting.status === "cancelled") {
      return NextResponse.json({ meeting }) // already terminal; no-op
    }

    // Only group admins can cancel.
    const { data: membership } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", meeting.group_id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (!membership || membership.role !== "admin") {
      return NextResponse.json({ error: "فقط المسؤول يمكنه إلغاء الاجتماع" }, { status: 403 })
    }

    const { data: updated, error } = await svc
      .from("meetings")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[Meetings] cancel error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ meeting: updated })
  } catch (error) {
    console.error("[Meetings] cancel exception:", error)
    return NextResponse.json({ error: "Failed to cancel meeting" }, { status: 500 })
  }
}
