import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { event_type, event_data, group_id, metadata } = await request.json()

    if (!event_type || !event_data) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    await supabase.from("monitoring_events").insert({
      event_type,
      user_id: user?.id || null,
      group_id: group_id || null,
      event_data,
      metadata: metadata || {},
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Monitoring log error:", error)
    return NextResponse.json({ error: "Failed to log event" }, { status: 500 })
  }
}
