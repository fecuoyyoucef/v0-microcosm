import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { sendNotification } from "@/lib/notifications-server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { groupId, newUserId } = await request.json()

    const { data: groupData } = await supabase.from("groups").select("name").eq("id", groupId).single()

    const { data: newUserProfile } = await supabase.from("profiles").select("display_name").eq("id", newUserId).single()

    const { data: members } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .neq("user_id", newUserId)

    if (members && members.length > 0) {
      const memberIds = members.map((m) => m.user_id)

      await sendNotification({
        userIds: memberIds,
        type: "group_invite",
        title: `عضو جديد انضم إلى ${groupData?.name}`,
        body: `${newUserProfile?.display_name || "مستخدم"} انضم للمجموعة`,
        data: {
          groupId,
          groupName: groupData?.name,
          url: `/chat/${groupId}`,
          newMemberId: newUserId,
        },
        groupId,
        senderId: newUserId,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Group member joined notification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
