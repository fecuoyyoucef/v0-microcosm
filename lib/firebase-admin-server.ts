// Firebase Admin - Server Side Only
// هذا الملف يعمل فقط على السيرفر

import admin from "firebase-admin"
import { createClient } from "@/lib/supabase/server"

let initialized = false

function getFirebaseAdmin() {
  if (initialized) {
    return admin
  }

  try {
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT
    if (!serviceAccountStr) {
      console.error("[Firebase Admin] FIREBASE_SERVICE_ACCOUNT not found")
      return null
    }

    const serviceAccount = JSON.parse(serviceAccountStr)

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      })
    }

    initialized = true
    console.log("[Firebase Admin] Initialized successfully")
    return admin
  } catch (error) {
    console.error("[Firebase Admin] Initialization error:", error)
    return null
  }
}

// إرسال إشعار لمستخدم واحد
export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<{ success: boolean; invalidToken?: boolean }> {
  try {
    const adminInstance = getFirebaseAdmin()
    if (!adminInstance) {
      console.error("[Firebase Admin] Admin instance not available")
      return { success: false }
    }

    const webpushNotification: any = {
      title,
      body,
      icon: "/icons/icon-192x192.png",
      vibrate: [200, 100, 200],
      requireInteraction: data?.priority === "high" || false,
      tag: data?.tag || `notification-${Date.now()}`,
    }

    if (data?.image) {
      webpushNotification.image = data.image
    }

    webpushNotification.actions = [
      {
        action: "open",
        title: "فتح",
      },
    ]

    const message = {
      token,
      notification: {
        title,
        body,
      },
      webpush: {
        notification: webpushNotification,
        fcmOptions: {
          link: data?.action_url || data?.url || "/",
        },
      },
    }

    console.log("[Firebase Admin] Sending notification-only message to token:", token.substring(0, 20) + "...")
    const result = await adminInstance.messaging().send(message)
    console.log("[Firebase Admin] Notification sent successfully, messageId:", result)
    return { success: true }
  } catch (error: any) {
    if (
      error.code === "messaging/registration-token-not-registered" ||
      error.code === "messaging/invalid-registration-token"
    ) {
      console.log("[Firebase Admin] Invalid token detected:", token.substring(0, 20))
      return { success: false, invalidToken: true }
    } else {
      console.error("[Firebase Admin] Send error:", error.code, error.message)
      return { success: false }
    }
  }
}

// إرسال إشعار لعدة مستخدمين
export async function sendPushNotificationToMany(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<{ success: number; failure: number; invalidTokens: string[] }> {
  if (tokens.length === 0) {
    console.log("[Firebase Admin] No tokens provided")
    return { success: 0, failure: 0, invalidTokens: [] }
  }

  // Remove duplicates
  const uniqueTokens = [...new Set(tokens)]
  console.log(`[Firebase Admin] ========== MULTICAST START ==========`)
  console.log(`[Firebase Admin] Received ${tokens.length} tokens, ${uniqueTokens.length} unique`)

  try {
    const adminInstance = getFirebaseAdmin()
    if (!adminInstance) {
      console.error("[Firebase Admin] Admin instance not available")
      return { success: 0, failure: uniqueTokens.length, invalidTokens: [] }
    }

    const webpushNotification: any = {
      title,
      body,
      icon: "/icons/icon-192x192.png",
      vibrate: [200, 100, 200],
      requireInteraction: data?.priority === "high" || false,
      tag: data?.tag || `notification-${Date.now()}`,
    }

    if (data?.image) {
      webpushNotification.image = data.image
    }

    webpushNotification.actions = [
      {
        action: "open",
        title: "فتح",
      },
    ]

    const message = {
      tokens: uniqueTokens,
      notification: {
        title,
        body,
      },
      webpush: {
        notification: webpushNotification,
        fcmOptions: {
          link: data?.action_url || data?.url || "/",
        },
      },
    }

    console.log(
      `[Firebase Admin] Message payload:`,
      JSON.stringify({
        tokensCount: uniqueTokens.length,
        notification: message.notification,
        webpush: { notification: { title: webpushNotification.title, body: webpushNotification.body } },
      }),
    )

    console.log(`[Firebase Admin] Calling sendEachForMulticast...`)
    const response = await adminInstance.messaging().sendEachForMulticast(message)

    console.log(`[Firebase Admin] ========== MULTICAST RESULT ==========`)
    console.log(`[Firebase Admin] Success count: ${response.successCount}`)
    console.log(`[Firebase Admin] Failure count: ${response.failureCount}`)

    const invalidTokens: string[] = []

    response.responses.forEach((resp, idx) => {
      const tokenPreview = uniqueTokens[idx].substring(0, 25) + "..."
      if (resp.success) {
        console.log(`[Firebase Admin] [${idx}] SUCCESS - token: ${tokenPreview}, messageId: ${resp.messageId}`)
      } else if (resp.error) {
        const errorCode = resp.error.code
        const errorMsg = resp.error.message
        console.error(`[Firebase Admin] [${idx}] FAILED - token: ${tokenPreview}, error: ${errorCode} - ${errorMsg}`)

        if (
          errorCode === "messaging/registration-token-not-registered" ||
          errorCode === "messaging/invalid-registration-token" ||
          errorCode === "messaging/invalid-argument"
        ) {
          invalidTokens.push(uniqueTokens[idx])
          console.log(`[Firebase Admin] [${idx}] Marked as INVALID`)
        }
      }
    })

    console.log(`[Firebase Admin] Invalid tokens found: ${invalidTokens.length}`)

    if (invalidTokens.length > 0) {
      console.log(`[Firebase Admin] Removing ${invalidTokens.length} invalid tokens from database...`)
      try {
        const supabase = await createClient()
        const { error } = await supabase.from("fcm_tokens").delete().in("token", invalidTokens)
        if (error) {
          console.error("[Firebase Admin] Error deleting invalid tokens:", error)
        } else {
          console.log(`[Firebase Admin] Successfully removed ${invalidTokens.length} invalid tokens`)
        }
      } catch (dbError) {
        console.error("[Firebase Admin] Database error while removing tokens:", dbError)
      }
    }

    console.log(`[Firebase Admin] ========== MULTICAST END ==========`)

    return {
      success: response.successCount,
      failure: response.failureCount,
      invalidTokens,
    }
  } catch (error: any) {
    console.error("[Firebase Admin] Multicast error:", error.code, error.message)
    return { success: 0, failure: uniqueTokens.length, invalidTokens: [] }
  }
}
