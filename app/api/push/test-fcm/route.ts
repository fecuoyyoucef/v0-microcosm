import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getFirebaseMessaging } from "@/lib/firebase/admin"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // التحقق من المستخدم
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // فحص إعدادات Firebase
    const checks = {
      FIREBASE_SERVICE_ACCOUNT: !!process.env.FIREBASE_SERVICE_ACCOUNT,
      NEXT_PUBLIC_FIREBASE_API_KEY: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      NEXT_PUBLIC_FIREBASE_APP_ID: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      NEXT_PUBLIC_FIREBASE_VAPID_KEY: !!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    }

    const allConfigured = Object.values(checks).every((v) => v)

    // فحص Firebase Admin
    let adminStatus = "not_configured"
    let adminError = null

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        if (parsed.project_id && parsed.private_key && parsed.client_email) {
          adminStatus = "configured"
        } else {
          adminStatus = "invalid_format"
          adminError = "Missing required fields: project_id, private_key, or client_email"
        }
      } catch (e) {
        adminStatus = "invalid_json"
        adminError = "FIREBASE_SERVICE_ACCOUNT is not valid JSON"
      }
    }

    // فحص Firebase Messaging
    let messagingStatus = "not_initialized"
    const messaging = getFirebaseMessaging()
    if (messaging) {
      messagingStatus = "ready"
    }

    // جلب tokens المستخدم
    const { data: tokens, error: tokensError } = await supabase.from("fcm_tokens").select("*").eq("user_id", user.id)

    // إرسال إشعار تجريبي إذا كان كل شيء جاهز
    let testResult = null
    if (messaging && tokens && tokens.length > 0) {
      try {
        const response = await messaging.sendEachForMulticast({
          tokens: tokens.map((t) => t.token),
          notification: {
            title: "اختبار الإشعارات",
            body: "هذا إشعار تجريبي من Synaptic Space",
          },
          webpush: {
            notification: {
              icon: "/icons/icon-192x192.png",
              badge: "/icons/icon-72x72.png",
            },
            fcmOptions: {
              link: "/chat/notifications",
            },
          },
        })

        testResult = {
          success: true,
          successCount: response.successCount,
          failureCount: response.failureCount,
          errors: response.responses.filter((r) => !r.success).map((r) => (r.error as any)?.message),
        }
      } catch (err: any) {
        testResult = {
          success: false,
          error: err.message,
        }
      }
    }

    return NextResponse.json({
      status: "ok",
      checks,
      allConfigured,
      adminStatus,
      adminError,
      messagingStatus,
      userTokens: tokens?.length || 0,
      tokensError: tokensError?.message,
      testResult,
      instructions: !allConfigured
        ? {
            message: "بعض متغيرات Firebase غير مكتملة",
            steps: [
              "1. اذهب إلى Firebase Console",
              "2. Project Settings → Service accounts",
              "3. Generate new private key",
              "4. انسخ محتوى JSON بالكامل",
              "5. أضفه كـ FIREBASE_SERVICE_ACCOUNT في قسم Vars",
            ],
          }
        : null,
    })
  } catch (error: any) {
    console.error("[FCM Test] Error:", error)
    return NextResponse.json(
      {
        status: "error",
        error: error.message,
      },
      { status: 500 },
    )
  }
}
