import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { sendPushNotificationToMany } from "@/lib/firebase-admin-server"

export async function POST(request: Request) {
  try {
    const { userIds, type, title, body, data } = await request.json()

    if (!userIds || userIds.length === 0 || !type || !title) {
      return NextResponse.json({ error: "بيانات مفقودة" }, { status: 400 })
    }

    const supabase = await createClient()

    const notifications = userIds.map((userId: string) => ({
      user_id: userId,
      type,
      title,
      body: body || "",
      is_read: false,
      data: data || {},
    }))

    const { error: notifError } = await supabase.from("notifications").insert(notifications)

    if (notifError) {
      console.error("[Notifications API] Insert error:", notifError)
      throw notifError
    }

    let pushSentCount = 0
    let pushFailedCount = 0

    try {
      const serviceSupabase = createServiceClient()
      const { data: fcmTokens, error: tokensError } = await serviceSupabase
        .from("fcm_tokens")
        .select("token, user_id")
        .in("user_id", userIds)

      if (tokensError) {
        console.error("[Notifications API] Tokens fetch error:", tokensError)
      }

      if (fcmTokens && fcmTokens.length > 0) {
        const tokens = fcmTokens.map((t) => t.token)
        console.log(`[Notifications API] Sending push to ${tokens.length} tokens for type: ${type}`)

        const result = await sendPushNotificationToMany(tokens, title, body || "", {
          url: data?.url || "/chat/notifications",
          priority: data?.priority || "normal",
          type,
        })

        pushSentCount = result.success
        pushFailedCount = result.failure

        console.log(`[Notifications API] Push result - Success: ${pushSentCount}, Failed: ${pushFailedCount}`)
      } else {
        console.log("[Notifications API] No FCM tokens found for users:", userIds)
      }
    } catch (pushError: any) {
      console.error("[Notifications API] Push error:", pushError)
    }

    return NextResponse.json({
      success: true,
      notificationsCreated: userIds.length,
      pushSentCount,
      pushFailedCount,
    })
  } catch (error: any) {
    console.error("[Notifications API] Error:", error)
    return NextResponse.json({ error: "فشل إرسال الإشعار", details: error.message }, { status: 500 })
  }
}
