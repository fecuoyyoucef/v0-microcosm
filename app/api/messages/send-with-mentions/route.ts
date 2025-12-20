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

    const { groupId, content, mentionedUsers } = await request.json()

    console.log("[v0] Processing mentions:", { groupId, mentionedUsers: mentionedUsers?.length })

    if (mentionedUsers && mentionedUsers.length > 0) {
      const { data: groupData } = await supabase.from("groups").select("name").eq("id", groupId).single()

      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", user.id)
        .single()

      await sendNotification({
        userIds: mentionedUsers,
        type: "mention",
        title: `${senderProfile?.display_name || "Someone"} أشار إليك`,
        body: content.substring(0, 100),
        data: {
          groupId,
          groupName: groupData?.name,
          url: `/chat/${groupId}`,
        },
        groupId,
        senderId: user.id,
      })

      console.log("[v0] Mention notifications sent to", mentionedUsers.length, "users")
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Send with mentions error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
