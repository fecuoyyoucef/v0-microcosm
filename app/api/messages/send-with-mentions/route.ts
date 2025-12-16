import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

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

    // Send notifications to mentioned users
    if (mentionedUsers && mentionedUsers.length > 0) {
      const { data: groupData } = await supabase.from("groups").select("name").eq("id", groupId).single()

      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", user.id)
        .single()

      // Create notifications for each mentioned user
      const notifications = mentionedUsers.map((userId: string) => ({
        user_id: userId,
        sender_id: user.id,
        group_id: groupId,
        type: "mention",
        title: `${senderProfile?.display_name} mentioned you`,
        body: content.substring(0, 100),
        data: {
          groupId,
          groupName: groupData?.name,
        },
      }))

      await supabase.from("notifications").insert(notifications)

      // Try to send push notifications
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userIds: mentionedUsers,
            title: `${senderProfile?.display_name} mentioned you in ${groupData?.name}`,
            body: content.substring(0, 100),
            data: {
              url: `/chat/${groupId}`,
              groupId,
            },
          }),
        })
      } catch (error) {
        console.error("[v0] Push notification error:", error)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Send with mentions error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
