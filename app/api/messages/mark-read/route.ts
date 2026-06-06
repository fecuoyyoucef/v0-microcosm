import { createClient, createServiceClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

/**
 * Rebuilt read-receipt endpoint.
 *
 * Instead of writing one row per message, we upsert a single per-group cursor
 * (message_read_state.last_read_at = now()). A message is "seen" by a member
 * when their cursor is >= the message's created_at. This change is published
 * over realtime, so the sender's subscription lights up the second tick live.
 */
export async function POST(request: NextRequest) {
  try {
    // Auth must use the cookie-bound client; the service client never sees
    // session cookies.
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { groupId } = await request.json()
    if (!groupId) {
      return NextResponse.json({ error: "groupId required" }, { status: 400 })
    }

    // Service client for the write (RLS already satisfied by verified identity).
    const svc = createServiceClient()
    const { error } = await svc.from("message_read_state").upsert(
      {
        group_id: groupId,
        user_id: user.id,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: "group_id,user_id" },
    )

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating read state:", error)
    return NextResponse.json({ error: "Failed to update read state" }, { status: 500 })
  }
}
