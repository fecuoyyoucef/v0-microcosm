import { createClient, createServiceClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { sendPushNotificationToMany } from "@/lib/firebase-admin-server"

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
    let diagnosticInfo: any = {}

    try {
      const serviceSupabase = createServiceClient()
      const { data: fcmTokens, error: tokensError } = await serviceSupabase
        .from("fcm_tokens")
        .select("token, user_id, created_at, updated_at")

      if (tokensError) {
        console.error("[Admin] Error fetching FCM tokens:", tokensError)
        diagnosticInfo.tokensFetchError = tokensError.message
      }

      if (fcmTokens && fcmTokens.length > 0) {
        console.log(`[Admin] ========== DIAGNOSTIC INFO ==========`)
        console.log(`[Admin] Total FCM tokens in DB: ${fcmTokens.length}`)

        const tokensByUser: Record<string, number> = {}
        fcmTokens.forEach((t) => {
          tokensByUser[t.user_id] = (tokensByUser[t.user_id] || 0) + 1
        })
        console.log(`[Admin] Tokens per user:`, tokensByUser)

        console.log(`[Admin] Token previews:`)
        fcmTokens.forEach((t, idx) => {
          console.log(
            `  [${idx}] user: ${t.user_id.substring(0, 8)}..., token: ${t.token.substring(0, 30)}..., updated: ${t.updated_at}`,
          )
        })

        const tokens = fcmTokens.map((t) => t.token)

        diagnosticInfo = {
          totalTokens: fcmTokens.length,
          uniqueUsers: Object.keys(tokensByUser).length,
          tokensByUser,
        }

        console.log(`[Admin] Calling sendPushNotificationToMany with ${tokens.length} tokens...`)

        const result = await sendPushNotificationToMany(tokens, title || "Synaptic Space", body || "لديك إشعار جديد", {
          url: actionUrl || "/chat/notifications",
          priority: priority || "normal",
          type: "admin_notification",
        })

        pushSentCount = result.success
        pushFailedCount = result.failure

        diagnosticInfo.pushResult = {
          success: result.success,
          failure: result.failure,
          invalidTokensCount: result.invalidTokens?.length || 0,
        }

        console.log(`[Admin] ========== PUSH RESULT ==========`)
        console.log(`[Admin] Success: ${pushSentCount}`)
        console.log(`[Admin] Failed: ${pushFailedCount}`)
        console.log(`[Admin] Invalid tokens: ${result.invalidTokens?.length || 0}`)

        if (result.invalidTokens && result.invalidTokens.length > 0) {
          console.log(
            `[Admin] Invalid tokens to remove:`,
            result.invalidTokens.map((t) => t.substring(0, 20) + "..."),
          )
          await supabase.from("fcm_tokens").delete().in("token", result.invalidTokens)
          console.log(`[Admin] Removed ${result.invalidTokens.length} invalid tokens from DB`)
        }
      } else {
        console.log("[Admin] No FCM tokens found in database!")
        diagnosticInfo.noTokens = true
      }
    } catch (pushError: any) {
      console.error("[Admin] Push notification error:", pushError)
      diagnosticInfo.pushError = pushError.message
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
          diagnosticInfo,
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
      diagnostic: diagnosticInfo,
    })
  } catch (error: any) {
    console.error("[Admin] Send notification error:", error)
    return NextResponse.json({ error: "فشل إرسال الإشعار", details: error.message }, { status: 500 })
  }
}
