import { createClient, createServiceClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// POST /api/meetings/[id]/ack  -> the current user acknowledges the alarm
// (entered the cell or pressed dismiss). Stops the repeating alarm for them.
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
    const { error } = await svc.from("meeting_alarm_state").upsert(
      {
        meeting_id: id,
        user_id: user.id,
        acknowledged_at: new Date().toISOString(),
      },
      { onConflict: "meeting_id,user_id", ignoreDuplicates: true },
    )

    if (error) {
      console.error("[Meetings] ack error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Meetings] ack exception:", error)
    return NextResponse.json({ error: "Failed to acknowledge alarm" }, { status: 500 })
  }
}
