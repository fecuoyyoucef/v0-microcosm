import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { requestId, groupId, userId } = await request.json()

    // Verify user is admin of this group
    const { data: membership } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .single()

    if (membership?.role !== "admin") {
      return NextResponse.json({ error: "Only admins can approve requests" }, { status: 403 })
    }

    // Update request status
    const { error: updateError } = await supabase
      .from("group_join_requests")
      .update({ status: "approved", processed_by: user.id, processed_at: new Date() })
      .eq("id", requestId)

    if (updateError) throw updateError

    // Add user as member
    const { error: memberError } = await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: userId,
      role: "member",
    })

    if (memberError) throw memberError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Approve request error:", error)
    return NextResponse.json({ error: "Failed to approve request" }, { status: 500 })
  }
}
