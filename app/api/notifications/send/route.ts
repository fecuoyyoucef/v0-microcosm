import { NextResponse } from "next/server"
import { requireGroupMember } from "@/lib/api-auth"
import { createServiceClient } from "@/lib/supabase/server"
import { sendPushNotificationToMany } from "@/lib/firebase-admin-server"

export async function POST(request: Request) {
  try {
    const { userIds: rawUserIds, type, title, body, data, groupId } = await request.json()

    if (!Array.isArray(rawUserIds) || rawUserIds.length === 0 || rawUserIds.length > 50 || !type || typeof title !== "string" || title.length > 200 || !groupId) {
      return NextResponse.json({ error: "بيانات مفقودة" }, { status: 400 })
    }

    const auth = await requireGroupMember(groupId)
    if (auth.response) return auth.response
    const senderId = auth.user!.id
    const { data: recipients, error: memberError } = await auth.supabase.from("group_members").select("user_id").eq("group_id", groupId).in("user_id", rawUserIds)
    if (memberError) return NextResponse.json({ error: "Unable to verify recipients" }, { status: 500 })
    const allowed = new Set((recipients ?? []).map((member) => member.user_id))
    const userIds: string[] = rawUserIds.filter((id: string) => allowed.has(id) && id !== senderId)

    if (userIds.length === 0) {
      return NextResponse.json({ success: true, notificationsCreated: 0, pushSentCount: 0, pushFailedCount: 0 })
    }

    const notifications = userIds.map((userId: string) => ({
      user_id: userId,
      type,
      title,
      body: body || "",
      is_read: false,
      data: data || {},
      group_id: groupId || null,
      sender_id: senderId || null,
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
          group_id: groupId || "",
          message_id: data?.messageId || "",
          senderName: data?.senderName || "",
          senderAvatar: data?.senderAvatar || "",
          cellAvatar: data?.cellAvatar || "",
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
