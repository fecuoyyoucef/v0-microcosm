import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { sendFCMNotification } from "@/lib/firebase/fcm-admin"

export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userIds, title, body, data } = await request.json()

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "userIds required" }, { status: 400 })
    }

    if (!title || !body) {
      return NextResponse.json({ error: "title and body required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get FCM tokens for users
    const { data: fcmTokens, error } = await supabase.from("fcm_tokens").select("token").in("user_id", userIds)

    if (error) {
      console.error("[FCM Send] Error fetching tokens:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!fcmTokens || fcmTokens.length === 0) {
      console.log("[FCM Send] No tokens found for users:", userIds)
      return NextResponse.json({ success: true, sent: 0 })
    }

    const tokens = fcmTokens.map((t) => t.token)
    console.log("[FCM Send] Sending to", tokens.length, "devices")

    // Send FCM notifications
    const result = await sendFCMNotification(tokens, { title, body }, data)

    return NextResponse.json({
      success: true,
      sent: result.success,
      failed: result.failed,
    })
  } catch (error) {
    console.error("[FCM Send] Error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}
