import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getFirebaseMessaging } from "@/lib/firebase/admin"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, userIds, title, body: messageBody, url, data, imageUrl } = body

    const targetUserIds = userIds || (userId ? [userId] : [])

    if (!targetUserIds || targetUserIds.length === 0) {
      return NextResponse.json({ error: "No user IDs provided" }, { status: 400 })
    }

    const messaging = getFirebaseMessaging()
    if (!messaging) {
      return NextResponse.json({ error: "Firebase not configured" }, { status: 500 })
    }

    const supabase = await createClient()

    // جلب FCM tokens من database
    const { data: tokens, error } = await supabase.from("fcm_tokens").select("*").in("user_id", targetUserIds)

    if (error) {
      console.error("[FCM] Error fetching tokens:", error)
      throw error
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: "No FCM tokens found" })
    }

    // إعداد الرسالة
    const message = {
      notification: {
        title: title || "Synaptic Space",
        body: messageBody || "لديك إشعار جديد",
        image: imageUrl,
      },
      data: {
        url: url || "/chat/notifications",
        click_action: url || "/chat/notifications",
        type: data?.type || "default",
        priority: data?.priority || "normal",
        ...data,
      },
      android: {
        priority: data?.priority === "high" ? ("high" as const) : ("normal" as const),
        notification: {
          icon: "/icons/icon-192x192.png",
          color: "#0ea5e9",
          sound: "default",
          clickAction: url || "/chat/notifications",
        },
      },
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: "default",
            alert: {
              title: title || "Synaptic Space",
              body: messageBody || "لديك إشعار جديد",
            },
          },
        },
      },
      webpush: {
        notification: {
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
          requireInteraction: data?.priority === "high",
        },
        fcmOptions: {
          link: url || "/chat/notifications",
        },
      },
    }

    let sentCount = 0
    const errors = []
    const tokenList = tokens.map((t) => t.token)

    // إرسال مجمّع (batch) - أكثر كفاءة
    try {
      const response = await messaging.sendEachForMulticast({
        tokens: tokenList,
        ...message,
      })

      sentCount = response.successCount

      // إزالة tokens غير صالحة
      if (response.failureCount > 0) {
        const invalidTokens: string[] = []
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = (resp.error as any)?.code
            if (
              errorCode === "messaging/invalid-registration-token" ||
              errorCode === "messaging/registration-token-not-registered"
            ) {
              invalidTokens.push(tokenList[idx])
            }
            errors.push({
              token: tokenList[idx].substring(0, 20) + "...",
              error: (resp.error as any)?.message,
            })
          }
        })

        // حذف tokens غير صالحة من database
        if (invalidTokens.length > 0) {
          await supabase.from("fcm_tokens").delete().in("token", invalidTokens)
        }
      }
    } catch (err: any) {
      console.error("[FCM] Send error:", err)
      errors.push({ error: err.message })
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      total: tokens.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error("[FCM] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
