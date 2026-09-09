import { createServiceClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const supabase = createServiceClient()
    const { content } = await request.json()
    const { messageId } = await params

    // Verify user owns the message
    const { data: message } = await supabase.from("messages").select("sender_id").eq("id", messageId).single()
    const messageRecord = message as { sender_id: string } | null

    if (!messageRecord) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (messageRecord.sender_id !== user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Update message
    const { error } = await (supabase.from("messages") as any)
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating message:", error)
    return NextResponse.json({ error: "Failed to update message" }, { status: 500 })
  }
}
