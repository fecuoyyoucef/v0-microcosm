import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import webPush from "web-push"

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails("mailto:youcef192837@gmail.com", vapidPublicKey, vapidPrivateKey)
}

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

async function sendPushToUser(supabase: any, userId: string, payload: string) {
  if (!vapidPublicKey || !vapidPrivateKey) return 0

  const { data: subscriptions } = await supabase.from("push_subscriptions").select("*").eq("user_id", userId)

  if (!subscriptions || subscriptions.length === 0) return 0

  let sent = 0
  const failedEndpoints: string[] = []

  for (const sub of subscriptions) {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payload,
      )
      sent++
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        failedEndpoints.push(sub.endpoint)
      }
    }
  }

  // Clean up invalid subscriptions
  if (failedEndpoints.length > 0) {
    await supabase.from("push_subscriptions").delete().eq("user_id", userId).in("endpoint", failedEndpoints)
  }

  return sent
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
      data: {
        priority: priority || "normal",
        action_url: actionUrl || null,
        action_label: actionLabel || null,
        sent_by_admin: true,
      },
    }))

    const { error: notifError } = await supabase.from("notifications").insert(notifications)

    if (notifError) {
      console.error("[v0] Notification insert error:", notifError)
      throw notifError
    }

    const pushPayload = JSON.stringify({
      title,
      body: body || "",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      tag: "admin-notification",
      priority: priority || "normal",
      url: actionUrl || "/chat/notifications",
      actions: actionLabel ? [{ action: "open", title: actionLabel }] : undefined,
    })

    let pushSentCount = 0
    for (const user of users) {
      const sent = await sendPushToUser(supabase, user.id, pushPayload)
      pushSentCount += sent
    }

    console.log(`[v0] Sent ${pushSentCount} push notifications`)

    // Try to save announcement log
    try {
      await supabase.from("system_announcements").insert({
        admin_id: admin.id,
        title,
        body,
        target: target || "all",
        priority: priority || "normal",
        action_url: actionUrl,
        action_label: actionLabel,
        sent_at: new Date().toISOString(),
        recipients_count: users.length,
      })
    } catch (e) {
      console.log("[v0] system_announcements table may not exist, skipping log")
    }

    // Try to log admin activity
    try {
      await supabase.from("admin_activity_log").insert({
        admin_id: admin.id,
        action_type: "send_notification",
        description: `إرسال إشعار: ${title}`,
        metadata: { recipients: users.length, pushSent: pushSentCount, target, priority },
      })
    } catch (e) {
      console.log("[v0] admin_activity_log table may not exist, skipping log")
    }

    return NextResponse.json({
      success: true,
      recipientsCount: users.length,
      pushSentCount,
    })
  } catch (error) {
    console.error("[v0] Send notification error:", error)
    return NextResponse.json({ error: "فشل إرسال الإشعار" }, { status: 500 })
  }
}
