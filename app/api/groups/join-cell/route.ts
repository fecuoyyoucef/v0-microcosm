import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { groupId } = await request.json()
    if (!groupId) return NextResponse.json({ error: "groupId is required" }, { status: 400 })

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .single()

    if (existingMember) {
      return NextResponse.json({ error: "Already a member" }, { status: 400 })
    }

    // Get group data to check privacy settings
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("settings")
      .eq("id", groupId)
      .single()

    if (groupError || !group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    const isPublic = group.settings?.privacy === "public"

    if (isPublic) {
      // Direct join for public cells
      const { error: joinError } = await supabase.from("group_members").insert({
        group_id: groupId,
        user_id: user.id,
        role: "member",
      })

      if (joinError) throw joinError

      return NextResponse.json({ success: true, type: "joined" })
    } else {
      // Submit join request for private cells
      const { error: requestError } = await supabase.from("group_join_requests").insert({
        group_id: groupId,
        user_id: user.id,
        status: "pending",
      })

      if (requestError) throw requestError

      return NextResponse.json({ success: true, type: "request_submitted" })
    }
  } catch (error) {
    console.error("Join cell error:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
