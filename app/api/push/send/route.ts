import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

let webpushConfigured = false

async function getWebPush() {
  const webpush = (await import("web-push")).default

  if (!webpushConfigured && process.env.VAPID_PRIVATE_KEY) {
    const vapidPublicKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
      "BDj8yhVUy0-Ued2Dw4joucx73R8-0HOjAcL5XeUGwxvp_KPrp1uBeFxvmGVXN2pvCnKtR_MG5pSPv0wx3f_OKzs"
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY.trim()

    webpush.setVapidDetails("mailto:youcef192837@gmail.com", vapidPublicKey, vapidPrivateKey)
    webpushConfigured = true
  }

  return webpush
}

export async function POST(request: Request) {
  try {
    const { userId, title, body, url, data } = await request.json()

    if (!process.env.VAPID_PRIVATE_KEY) {
      console.error("[Push] VAPID_PRIVATE_KEY not configured")
      return NextResponse.json({ error: "Push notifications not configured" }, { status: 500 })
    }

    const webpush = await getWebPush()
    const supabase = await createClient()

    // Get user's push subscriptions
    const { data: subscriptions, error } = await supabase.from("push_subscriptions").select("*").eq("user_id", userId)

    if (error) {
      console.error("[Push] Error fetching subscriptions:", error)
      throw error
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: "No subscriptions found" })
    }

    const payload = JSON.stringify({
      title: title || "Synaptic Space",
      body: body || "لديك إشعار جديد",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      url: url || "/chat/notifications",
      ...data,
    })

    let sentCount = 0

    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        }

        await webpush.sendNotification(pushSubscription, payload)
        sentCount++
      } catch (err: any) {
        console.error("[Push] Send error:", err.statusCode, err.body)

        // Remove invalid subscriptions (410 Gone or 404 Not Found)
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint)
        }
      }
    }

    return NextResponse.json({ success: true, sent: sentCount, total: subscriptions.length })
  } catch (error: any) {
    console.error("[Push] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
