import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, type, title, body: notifBody, priority, data, groupId, actorId, relatedId } = body

    const supabase = await createServerClient()

    // دعم إرسال لعدة مستخدمين
    const userIds = Array.isArray(userId) ? userId : [userId]

    const notifications = userIds.map((uid) => ({
      user_id: uid,
      type,
      title,
      body: notifBody,
      priority: priority || "normal",
      data: data || {},
      group_id: groupId,
      actor_id: actorId,
      related_id: relatedId,
    }))

    // إنشاء الإشعارات
    const { data: createdNotifications, error } = await supabase.from("notifications").insert(notifications).select()

    if (error) {
      console.error("[Notifications API] Error creating notification:", error)
      return NextResponse.json({ error: "Failed to create notification" }, { status: 500 })
    }

    const pushPromises = userIds.map(async (uid) => {
      try {
        const { data: tokens } = await supabase.from("fcm_tokens").select("token").eq("user_id", uid)

        if (tokens && tokens.length > 0) {
          return fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/send-push`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userIds: [uid],
              title,
              body: notifBody,
              data: {
                ...data,
                type,
                notificationId: createdNotifications.find((n) => n.user_id === uid)?.id,
              },
            }),
          })
        }
      } catch (pushError) {
        console.error("[Notifications API] Push error for user", uid, ":", pushError)
        return null
      }
    })

    // انتظار جميع الإرسالات بالتوازي
    await Promise.allSettled(pushPromises)

    return NextResponse.json({ success: true, notifications: createdNotifications })
  } catch (error) {
    console.error("[Notifications API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
