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

    const { messageId, emoji, recipientId, groupId } = await request.json()

    const { data: senderProfile } = await supabase.from("profiles").select("display_name").eq("id", user.id).single()

    await sendNotification({
      userIds: [recipientId],
      type: "reaction",
      title: `${senderProfile?.display_name || "مستخدم"} تفاعل مع رسالتك`,
      body: `تفاعل بـ ${emoji}`,
      data: {
        messageId,
        emoji,
        groupId,
        url: `/chat/${groupId}`,
      },
      groupId,
      senderId: user.id,
      messageId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Reaction notification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
