import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import webpush from "web-push"

const vapidPublicKey =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BDj8yhVUy0-Ued2Dw4joucx73R8-0HOjAcL5XeUGwxvp_KPrp1uBeFxvmGVXN2pvCnKtR_MG5pSPv0wx3f_OKzs"
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ""

if (vapidPrivateKey) {
  webpush.setVapidDetails("mailto:youcef192837@gmail.com", vapidPublicKey, vapidPrivateKey)
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
    if (vapidPrivateKey) {
      // Get all push subscriptions
      const { data: allSubscriptions } = await supabase.from("push_subscriptions").select("*")

      if (allSubscriptions && allSubscriptions.length > 0) {
        const payload = JSON.stringify({
          title: title || "Synaptic Space",
          body: body || "لديك إشعار جديد",
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
          url: actionUrl || "/chat/notifications",
          tag: "admin-notification",
          priority: priority || "normal",
        })

        for (const sub of allSubscriptions) {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth,
                },
              },
              payload,
            )
            pushSentCount++
          } catch (err: any) {
            // Remove invalid subscriptions
            if (err.statusCode === 410 || err.statusCode === 404) {
              await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint)
            }
          }
        }
      }
    }

    // Log admin activity
    try {
      await supabase.from("admin_activity_log").insert({
        admin_id: admin.id,
        action_type: "send_notification",
        description: `إرسال إشعار: ${title}`,
        metadata: { recipients: users.length, pushSent: pushSentCount, target, priority },
      })
    } catch (e) {
      // Table may not exist
    }

    return NextResponse.json({
      success: true,
      recipientsCount: users.length,
      pushSentCount,
    })
  } catch (error) {
    console.error("[Admin] Send notification error:", error)
    return NextResponse.json({ error: "فشل إرسال الإشعار" }, { status: 500 })
  }
}
