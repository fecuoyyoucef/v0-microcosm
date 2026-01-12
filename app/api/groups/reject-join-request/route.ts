import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { requestId } = await request.json()

    // Verify request exists and get group info
    const { data: joinRequest } = await supabase
      .from("group_join_requests")
      .select("group_id")
      .eq("id", requestId)
      .single()

    if (!joinRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    // Verify user is admin of this group
    const { data: membership } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", joinRequest.group_id)
      .eq("user_id", user.id)
      .single()

    if (membership?.role !== "admin") {
      return NextResponse.json({ error: "Only admins can reject requests" }, { status: 403 })
    }

    // Update request status
    const { error: updateError } = await supabase
      .from("group_join_requests")
      .update({ status: "rejected", processed_by: user.id, processed_at: new Date() })
      .eq("id", requestId)

    if (updateError) throw updateError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Reject request error:", error)
    return NextResponse.json({ error: "Failed to reject request" }, { status: 500 })
  }
}
