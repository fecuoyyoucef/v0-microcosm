import { createServiceClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { messageIds } = await request.json()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Insert read records for all messages
    const readRecords = messageIds.map((messageId: string) => ({
      message_id: messageId,
      user_id: user.id,
      read_at: new Date().toISOString(),
    }))

    const { error } = await supabase.from("message_reads").upsert(readRecords, {
      onConflict: "message_id,user_id",
      ignoreDuplicates: true,
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking messages as read:", error)
    return NextResponse.json({ error: "Failed to mark messages as read" }, { status: 500 })
  }
}
