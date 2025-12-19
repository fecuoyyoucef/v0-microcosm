import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, userIds, title, body: messageBody, url, data } = body

    const targetUserIds = userIds || (userId ? [userId] : [])

    if (targetUserIds.length === 0) {
      return NextResponse.json({ error: "No user IDs provided" }, { status: 400 })
    }

    // التحقق من إعدادات Firebase
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    if (!serviceAccount) {
      return NextResponse.json({ error: "Firebase not configured" }, { status: 500 })
    }

    // استيراد Firebase Admin ديناميكياً (server-side only)
    const { initializeApp, getApps, cert } = await import("firebase-admin/app")
    const { getMessaging } = await import("firebase-admin/messaging")

    // تهيئة Firebase Admin
    let app
    if (getApps().length === 0) {
      const credentials = JSON.parse(serviceAccount)
      app = initializeApp({
        credential: cert(credentials),
        projectId: credentials.project_id,
      })
    } else {
      app = getApps()[0]
    }

    const messaging = getMessaging(app)
    const supabase = await createClient()

    // جلب FCM tokens
    const { data: tokens, error } = await supabase.from("fcm_tokens").select("token").in("user_id", targetUserIds)

    if (error) {
      console.error("[Firebase Send] Database error:", error)
      throw error
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: "No tokens found" })
    }

    // إعداد الرسالة
    const message = {
      notification: {
        title: title || "Synaptic Space",
        body: messageBody || "لديك إشعار جديد",
      },
      data: {
        url: url || "/chat",
        type: data?.type || "default",
        ...(data || {}),
      },
      webpush: {
        notification: {
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
        },
        fcmOptions: {
          link: url || "/chat",
        },
      },
    }

    // إرسال للجميع
    const tokenList = tokens.map((t) => t.token)
    const response = await messaging.sendEachForMulticast({
      tokens: tokenList,
      ...message,
    })

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
        }
      })

      if (invalidTokens.length > 0) {
        await supabase.from("fcm_tokens").delete().in("token", invalidTokens)
      }
    }

    return NextResponse.json({
      success: true,
      sent: response.successCount,
      total: tokens.length,
    })
  } catch (error: any) {
    console.error("[Firebase Send] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
