import { createClient, createServiceClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // IMPORTANT: use the cookie-bound client to read the current user.
    // The service client doesn't read cookies, so getUser() returned null
    // here and silently failed every read receipt write.
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { messageId } = await request.json()
    if (!messageId) {
      return NextResponse.json({ error: "messageId required" }, { status: 400 })
    }

    // Use the service client only for the actual write so RLS doesn't block
    // it. The user identity has already been verified above.
    const svc = createServiceClient()
    const { error } = await svc.from("message_reads").upsert(
      {
        message_id: messageId,
        user_id: user.id,
        read_at: new Date().toISOString(),
      },
      { onConflict: "message_id,user_id" },
    )

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking message as read:", error)
    return NextResponse.json({ error: "Failed to mark message as read" }, { status: 500 })
  }
}
