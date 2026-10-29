import { NextResponse } from "next/server"
import { requireUser } from "@/lib/api-auth"

type WebPushSubscriptionPayload = {
  endpoint?: unknown
  keys?: {
    p256dh?: unknown
    auth?: unknown
  }
}

function parseSubscription(value: unknown) {
  if (!value || typeof value !== "object") return null

  const subscription = value as WebPushSubscriptionPayload
  const endpoint = typeof subscription.endpoint === "string" ? subscription.endpoint.trim() : ""
  const p256dh = typeof subscription.keys?.p256dh === "string" ? subscription.keys.p256dh.trim() : ""
  const auth = typeof subscription.keys?.auth === "string" ? subscription.keys.auth.trim() : ""

  try {
    const url = new URL(endpoint)
    if (url.protocol !== "https:") return null
  } catch {
    return null
  }

  if (!p256dh || !auth || endpoint.length > 2048 || p256dh.length > 512 || auth.length > 512) {
    return null
  }

  return { endpoint, p256dh, auth }
}

export async function POST(request: Request) {
  const auth = await requireUser()
  if (!auth.user) return auth.response

  try {
    const subscription = parseSubscription(await request.json())
    if (!subscription) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 })
    }

    const { error } = await auth.supabase.from("push_subscriptions").upsert(
      {
        user_id: auth.user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,endpoint" },
    )

    if (error) {
      console.error("[Push] Subscription persistence failed", { code: error.code })
      return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
