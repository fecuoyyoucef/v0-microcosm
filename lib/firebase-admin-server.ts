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

    const result = await adminInstance.messaging().send(message)
    return { success: true }
  } catch (error: any) {
    if (
      error.code === "messaging/registration-token-not-registered" ||
      error.code === "messaging/invalid-registration-token"
    ) {
      return { success: false, invalidToken: true }
    } else {
      console.error("[Firebase Admin] Send error:", error.code, error.message)
      return { success: false }
    }
  }
}

export async function sendPushNotificationToMany(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<{ success: number; failure: number; invalidTokens: string[] }> {
  if (tokens.length === 0) {
    return { success: 0, failure: 0, invalidTokens: [] }
  }

  // Remove duplicates
  const uniqueTokens = [...new Set(tokens)]
  console.log(`[Firebase] Sending to ${uniqueTokens.length} unique tokens (from ${tokens.length} total)`)

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

    const sendPromises = uniqueTokens.map(async (token) => {
      try {
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

        await adminInstance.messaging().send(message)
        return { success: true, token, invalidToken: false }
      } catch (error: any) {
        const isInvalid =
          error.code === "messaging/registration-token-not-registered" ||
          error.code === "messaging/invalid-registration-token" ||
          error.code === "messaging/invalid-argument"

        return { success: false, token, invalidToken: isInvalid }
      }
    })

    console.log(`[Firebase] Starting parallel send to ${uniqueTokens.length} tokens...`)
    const startTime = Date.now()
    const results = await Promise.all(sendPromises)
    const endTime = Date.now()
    console.log(`[Firebase] Parallel send completed in ${endTime - startTime}ms`)

    const successCount = results.filter((r) => r.success).length
    const failureCount = results.filter((r) => !r.success).length
    const invalidTokens = results.filter((r) => r.invalidToken).map((r) => r.token)

    console.log(`[Firebase] Results: ${successCount} success, ${failureCount} failed, ${invalidTokens.length} invalid`)

    if (invalidTokens.length > 0) {
      try {
        const supabase = await createClient()
        await supabase.from("fcm_tokens").delete().in("token", invalidTokens)
        console.log(`[Firebase] Removed ${invalidTokens.length} invalid tokens`)
      } catch (dbError) {
        console.error("[Firebase] Error removing invalid tokens:", dbError)
      }
    }

    return {
      success: successCount,
      failure: failureCount,
      invalidTokens,
    }
  } catch (error: any) {
    console.error("[Firebase Admin] Multicast error:", error)
    return { success: 0, failure: uniqueTokens.length, invalidTokens: [] }
  }
}
