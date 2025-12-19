// Firebase Admin - Server Side Only
// هذا الملف يعمل فقط على السيرفر

import admin from "firebase-admin"

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
): Promise<boolean> {
  try {
    const adminInstance = getFirebaseAdmin()
    if (!adminInstance) {
      console.error("[Firebase Admin] Admin instance not available")
      return false
    }

    const stringData: Record<string, string> = {}
    if (data) {
      Object.keys(data).forEach((key) => {
        stringData[key] = String(data[key])
      })
    }

    const message = {
      token,
      notification: {
        title,
        body,
      },
      data: stringData,
      webpush: {
        notification: {
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
          vibrate: [200, 100, 200],
          requireInteraction: true,
        },
        fcmOptions: {
          link: stringData?.url || "/",
        },
      },
    }

    console.log("[Firebase Admin] Sending to token:", token.substring(0, 20) + "...")
    const result = await adminInstance.messaging().send(message)
    console.log("[Firebase Admin] Notification sent successfully, messageId:", result)
    return true
  } catch (error: any) {
    // Token غير صالح - يجب حذفه
    if (
      error.code === "messaging/registration-token-not-registered" ||
      error.code === "messaging/invalid-registration-token"
    ) {
      console.log("[Firebase Admin] Invalid token:", token.substring(0, 20))
      return false
    } else {
      console.error("[Firebase Admin] Send error:", error.code, error.message)
      return false
    }
  }
}

// إرسال إشعارات لعدة مستخدمين
export async function sendPushNotificationToMany(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<{ success: number; failure: number; invalidTokens: string[] }> {
  if (tokens.length === 0) {
    return { success: 0, failure: 0, invalidTokens: [] }
  }

  try {
    const adminInstance = getFirebaseAdmin()
    if (!adminInstance) {
      console.error("[Firebase Admin] Admin instance not available")
      return { success: 0, failure: tokens.length, invalidTokens: [] }
    }

    const stringData: Record<string, string> = {}
    if (data) {
      Object.keys(data).forEach((key) => {
        stringData[key] = String(data[key])
      })
    }

    const message = {
      tokens,
      notification: {
        title,
        body,
      },
      data: stringData,
      webpush: {
        notification: {
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
          vibrate: [200, 100, 200],
        },
        fcmOptions: {
          link: stringData?.url || "/",
        },
      },
    }

    console.log(`[Firebase Admin] Sending to ${tokens.length} tokens`)
    const response = await adminInstance.messaging().sendEachForMulticast(message)
    console.log(`[Firebase Admin] Results: ${response.successCount} success, ${response.failureCount} failure`)

    const invalidTokens: string[] = []
    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error) {
        const errorCode = resp.error.code
        if (
          errorCode === "messaging/registration-token-not-registered" ||
          errorCode === "messaging/invalid-registration-token"
        ) {
          invalidTokens.push(tokens[idx])
        }
        console.error(`[Firebase Admin] Token ${idx} error:`, errorCode)
      }
    })

    return {
      success: response.successCount,
      failure: response.failureCount,
      invalidTokens,
    }
  } catch (error: any) {
    console.error("[Firebase Admin] Multicast error:", error.code, error.message)
    return { success: 0, failure: tokens.length, invalidTokens: [] }
  }
}
