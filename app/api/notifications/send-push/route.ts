import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { sendPushNotificationToMany } from "@/lib/firebase-admin-server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    // التحقق من المستخدم
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { userIds, title, body: messageBody, data } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "userIds required" }, { status: 400 })
    }

    if (!title || !messageBody) {
      return NextResponse.json({ error: "title and body required" }, { status: 400 })
    }

    // جلب FCM tokens للمستخدمين المحددين
    const { data: tokens, error } = await supabase.from("fcm_tokens").select("token").in("user_id", userIds)

    if (error) throw error

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No tokens found",
        sent: 0,
      })
    }

    // إرسال الإشعارات
    const tokenStrings = tokens.map((t) => t.token)
    const result = await sendPushNotificationToMany(tokenStrings, title, messageBody, data)

    if (result.invalidTokens && result.invalidTokens.length > 0) {
      console.log(`[API] Deleting ${result.invalidTokens.length} invalid tokens`)
      await supabase.from("fcm_tokens").delete().in("token", result.invalidTokens)
    }

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error("[API] Send push error:", error)
    return NextResponse.json({ error: error.message || "Failed to send notifications" }, { status: 500 })
  }
}
