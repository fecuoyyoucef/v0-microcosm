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
    if (!adminInstance) return false

    const message = {
      token,
      notification: {
        title,
        body,
      },
      data: data || {},
      webpush: {
        notification: {
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
          vibrate: [200, 100, 200],
          requireInteraction: true,
        },
        fcmOptions: {
          link: data?.url || "/",
        },
      },
    }

    await adminInstance.messaging().send(message)
    console.log("[Firebase Admin] Notification sent successfully")
    return true
  } catch (error: any) {
    // Token غير صالح - يجب حذفه
    if (error.code === "messaging/registration-token-not-registered") {
      console.log("[Firebase Admin] Invalid token, should be removed")
    } else {
      console.error("[Firebase Admin] Send error:", error)
    }
    return false
  }
}

// إرسال إشعارات لعدة مستخدمين
export async function sendPushNotificationToMany(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<{ success: number; failure: number }> {
  if (tokens.length === 0) {
    return { success: 0, failure: 0 }
  }

  try {
    const adminInstance = getFirebaseAdmin()
    if (!adminInstance) return { success: 0, failure: tokens.length }

    const message = {
      tokens,
      notification: {
        title,
        body,
      },
      data: data || {},
      webpush: {
        notification: {
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
          vibrate: [200, 100, 200],
        },
        fcmOptions: {
          link: data?.url || "/",
        },
      },
    }

    const response = await adminInstance.messaging().sendEachForMulticast(message)
    console.log(`[Firebase Admin] Sent: ${response.successCount} success, ${response.failureCount} failure`)

    return {
      success: response.successCount,
      failure: response.failureCount,
    }
  } catch (error) {
    console.error("[Firebase Admin] Multicast error:", error)
    return { success: 0, failure: tokens.length }
  }
}
