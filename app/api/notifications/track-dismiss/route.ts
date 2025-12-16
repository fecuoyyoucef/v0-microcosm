import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { notificationId, dismissed } = await request.json()

    if (!notificationId) {
      return NextResponse.json({ error: "notificationId required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from("notifications")
      .update({
        dismissed: dismissed ?? true,
        dismissed_at: new Date().toISOString(),
      })
      .eq("id", notificationId)

    if (error) {
      console.error("[Dismiss] Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Dismiss] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
