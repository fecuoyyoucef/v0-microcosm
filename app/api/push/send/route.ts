import { requireGroupMember, requireUser } from "@/lib/api-auth"
import { NextResponse } from "next/server"

let webpushConfigured = false

async function getWebPush() {
  const webpush = (await import("web-push")).default

  if (!webpushConfigured && process.env.VAPID_PRIVATE_KEY) {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY.trim()
    if (!vapidPublicKey) throw new Error("Push notifications are not configured")

    webpush.setVapidDetails("mailto:youcef192837@gmail.com", vapidPublicKey, vapidPrivateKey)
    webpushConfigured = true
  }

  return webpush
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, userIds, title, body: messageBody, url, data, useFCM } = body
    const auth = data?.groupId || data?.group_id ? await requireGroupMember(data.groupId || data.group_id) : await requireUser()
    if (auth.response) return auth.response

    const requestedUserIds = Array.isArray(userIds) ? userIds : userId ? [userId] : []
    const targetUserIds = auth.member
      ? Array.from(new Set(requestedUserIds)).filter((id) => typeof id === "string")
      : requestedUserIds.filter((id) => id === auth.user!.id)
    if (auth.member) {
      const { data: recipients, error: recipientError } = await auth.supabase.from("group_members").select("user_id").eq("group_id", data.groupId || data.group_id).in("user_id", targetUserIds)
      if (recipientError || (recipients?.length ?? 0) !== targetUserIds.length) {
        return NextResponse.json({ error: "Invalid recipients" }, { status: 403 })
      }
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json({ error: "No user IDs provided" }, { status: 400 })
    }

    if (!process.env.VAPID_PRIVATE_KEY) {
      console.error("[Push] VAPID_PRIVATE_KEY not configured")
      return NextResponse.json({ error: "Push notifications not configured" }, { status: 500 })
    }

    if (useFCM && process.env.FIREBASE_SERVICE_ACCOUNT) {
      // إرسال عبر Firebase FCM
      const fcmResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push/send-fcm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (fcmResponse.ok) {
        return fcmResponse
      }

      console.warn("[Push] FCM failed, falling back to Web Push")
    }

    const webpush = await getWebPush()
    const { data: subscriptions, error } = await auth.supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", targetUserIds)

    if (error) {
      console.error("[Push] Error fetching subscriptions:", error)
      throw error
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: "No subscriptions found" })
    }

    // Use a stable tag per group so notifications replace each other
    const stableTag = data?.groupId
      ? `notif-group-${data.groupId}`
      : data?.group_id
        ? `notif-group-${data.group_id}`
        : `notif-${data?.type || "default"}`

    const payload = JSON.stringify({
      title: title || "Synaptic Space",
      body: messageBody || "لديك إشعار جديد",
      icon: "/icons/notification-icon.png",
      // Badge = small status-bar icon (monochrome with transparency for Android)
      badge: "/notification-icon.png",
      url: url || "/chat/notifications",
      tag: stableTag,
      renotify: true,
      requireInteraction: data?.priority === "high",
      ...data,
      tag: stableTag,
    })

    let sentCount = 0
    const errors = []

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        }

        await webpush.sendNotification(pushSubscription, payload)
        return { success: true, userId: sub.user_id }
      } catch (err: any) {
        console.error("[Push] Send error:", err.statusCode, err.body)

        // Remove invalid subscriptions (410 Gone or 404 Not Found)
        if (err.statusCode === 410 || err.statusCode === 404) {
          await auth.supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint)
        }

        return { success: false, userId: sub.user_id, error: err.message }
      }
    })

    const results = await Promise.all(sendPromises)
    sentCount = results.filter((r) => r.success).length
    const failedResults = results.filter((r) => !r.success)
    if (failedResults.length > 0) {
      failedResults.forEach((r) => errors.push({ userId: r.userId, error: r.error }))
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      total: subscriptions.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error("[Push] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
