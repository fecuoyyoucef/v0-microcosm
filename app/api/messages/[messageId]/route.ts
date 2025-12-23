import { createServiceClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function PATCH(request: NextRequest, { params }: { params: { messageId: string } }) {
  try {
    const supabase = createServiceClient()
    const { content } = await request.json()
    const { messageId } = params

    // Verify user owns the message
    const { data: message } = await supabase.from("messages").select("sender_id").eq("id", messageId).single()

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (message.sender_id !== user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Update message
    const { error } = await supabase
      .from("messages")
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
