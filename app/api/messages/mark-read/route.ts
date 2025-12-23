import { createServiceClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { messageId } = await request.json()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Insert read record
    const { error } = await supabase.from("message_reads").upsert(
      {
        message_id: messageId,
        user_id: user.id,
        read_at: new Date().toISOString(),
      },
      {
        onConflict: "message_id,user_id",
      },
    )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking message as read:", error)
    return NextResponse.json({ error: "Failed to mark message as read" }, { status: 500 })
  }
}
