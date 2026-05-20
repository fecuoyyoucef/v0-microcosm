import { createClient, createServiceClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Auth via the cookie-bound client. The previous version called
    // getUser() on the service client which never sees cookies, so every
    // call 401'd silently and read receipts never landed.
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    console.log("[v0] mark-read-bulk auth result:", user?.id ?? "no user", authError?.message ?? "no error")

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { messageIds } = await request.json()
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ error: "messageIds required" }, { status: 400 })
    }

    console.log("[v0] mark-read-bulk inserting", messageIds.length, "reads for user", user.id)

    const readRecords = messageIds.map((messageId: string) => ({
      message_id: messageId,
      user_id: user.id,
      read_at: new Date().toISOString(),
    }))

    // Service client for the write itself (bypasses RLS); identity is
    // already verified.
    const svc = createServiceClient()
    const { error } = await svc.from("message_reads").upsert(readRecords, {
      onConflict: "message_id,user_id",
      ignoreDuplicates: true,
    })

    if (error) {
      console.error("[v0] mark-read-bulk DB error:", error)
      throw error
    }

    console.log("[v0] mark-read-bulk success")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking messages as read:", error)
    return NextResponse.json({ error: "Failed to mark messages as read" }, { status: 500 })
  }
}
