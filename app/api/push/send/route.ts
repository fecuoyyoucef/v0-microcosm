import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import webPush from "web-push"

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails("mailto:youcef192837@gmail.com", vapidPublicKey, vapidPrivateKey)
}

export async function POST(request: Request) {
  try {
    const { userId, title, body, data } = await request.json()

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("[v0] VAPID keys not configured")
      return NextResponse.json({ error: "Push notifications not configured" }, { status: 500 })
    }

    const supabase = await createClient()

    // Get user's push subscriptions
    const { data: subscriptions, error } = await supabase.from("push_subscriptions").select("*").eq("user_id", userId)

    if (error) {
      console.error("[v0] Error fetching subscriptions:", error)
      throw error
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[v0] No push subscriptions for user:", userId)
      return NextResponse.json({ success: true, sent: 0 })
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      ...data,
    })

    let sentCount = 0
    const failedEndpoints: string[] = []

    // Send to all user's subscriptions
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
        sentCount++
      } catch (err: any) {
        console.error("[v0] Push send error:", err.message)

        // Remove invalid subscriptions (410 Gone or 404 Not Found)
        if (err.statusCode === 410 || err.statusCode === 404) {
          failedEndpoints.push(sub.endpoint)
        }
      }
    }

    // Clean up invalid subscriptions
    if (failedEndpoints.length > 0) {
      await supabase.from("push_subscriptions").delete().eq("user_id", userId).in("endpoint", failedEndpoints)
    }

    return NextResponse.json({ success: true, sent: sentCount })
  } catch (error) {
    console.error("[v0] Push notification error:", error)
    return NextResponse.json({ error: "Failed to send push notification" }, { status: 500 })
  }
}
