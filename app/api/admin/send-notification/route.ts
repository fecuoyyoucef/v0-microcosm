import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { sendPushNotification } from "@/lib/firebase-admin-server"

async function verifyAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_session")?.value
  if (!token) return null

  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString())
    if (decoded.exp < Date.now()) return null
    return decoded
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const admin = await verifyAdmin()
  if (!admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
  }

  try {
    const { title, body, target, priority, actionUrl, actionLabel } = await request.json()

    if (!title) {
      return NextResponse.json({ error: "العنوان مطلوب" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get all users
    const { data: users, error: usersError } = await supabase.from("profiles").select("id")

    if (usersError) throw usersError

    if (!users || users.length === 0) {
      return NextResponse.json({ error: "لا يوجد مستخدمين" }, { status: 400 })
    }

    // Create notifications for all users in database
    const notifications = users.map((user) => ({
      user_id: user.id,
      type: "system",
      title,
      body: body || "",
      is_read: false,
      data: {
        priority: priority || "normal",
        action_url: actionUrl || "/chat/notifications",
        action_label: actionLabel || null,
        sent_by_admin: true,
      },
    }))

    const { error: notifError } = await supabase.from("notifications").insert(notifications)

    if (notifError) {
      console.error("[Admin] Notification insert error:", notifError)
      throw notifError
    }

    let pushSentCount = 0
    let pushFailedCount = 0

    try {
      // Get all FCM tokens
      const { data: fcmTokens, error: tokensError } = await supabase.from("fcm_tokens").select("token, user_id")

      if (tokensError) {
        console.error("[Admin] Error fetching FCM tokens:", tokensError)
      }

      if (fcmTokens && fcmTokens.length > 0) {
        console.log(`[Admin] Sending push to ${fcmTokens.length} FCM tokens`)

        // Send to each token
        for (const { token, user_id } of fcmTokens) {
          try {
            const result = await sendPushNotification(token, {
              title: title || "Synaptic Space",
              body: body || "لديك إشعار جديد",
              data: {
                url: actionUrl || "/chat/notifications",
                priority: priority || "normal",
                type: "admin_notification",
              },
            })

            if (result.success) {
              pushSentCount++
            } else {
              pushFailedCount++
              // Remove invalid token
              if (result.error?.includes("not-registered") || result.error?.includes("invalid")) {
                await supabase.from("fcm_tokens").delete().eq("token", token)
                console.log(`[Admin] Removed invalid FCM token for user ${user_id}`)
              }
            }
          } catch (err) {
            console.error(`[Admin] FCM send error for user ${user_id}:`, err)
            pushFailedCount++
          }
        }
      } else {
        console.log("[Admin] No FCM tokens found")
      }
    } catch (pushError) {
      console.error("[Admin] Push notification error:", pushError)
    }

    // Log admin activity
    try {
      await supabase.from("admin_activity_log").insert({
        admin_id: admin.id,
        action_type: "send_notification",
        description: `إرسال إشعار: ${title}`,
        metadata: {
          recipients: users.length,
          pushSent: pushSentCount,
          pushFailed: pushFailedCount,
          target,
          priority,
        },
      })
    } catch (e) {
      // Table may not exist
    }

    return NextResponse.json({
      success: true,
      recipientsCount: users.length,
      pushSentCount,
      pushFailedCount,
    })
  } catch (error) {
    console.error("[Admin] Send notification error:", error)
    return NextResponse.json({ error: "فشل إرسال الإشعار" }, { status: 500 })
  }
}
