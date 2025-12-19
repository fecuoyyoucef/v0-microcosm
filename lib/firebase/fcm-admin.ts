import * as admin from "firebase-admin"

let app: admin.app.App | undefined

export function getFirebaseAdmin() {
  // Only run on server
  if (typeof window !== "undefined") {
    throw new Error("Firebase Admin SDK cannot be used in client-side code")
  }

  if (app) return app

  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT

    if (!serviceAccount) {
      console.error("[FCM Admin] FIREBASE_SERVICE_ACCOUNT not found")
      return null
    }

    const serviceAccountJSON = JSON.parse(serviceAccount)

    // Check if already initialized
    if (admin.apps.length > 0) {
      app = admin.apps[0]
      return app
    }

    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountJSON),
    })

    console.log("[FCM Admin] Firebase Admin initialized")
    return app
  } catch (error) {
    console.error("[FCM Admin] Error initializing:", error)
    return null
  }
}

export async function sendFCMNotification(
  tokens: string[],
  notification: {
    title: string
    body: string
    icon?: string
    badge?: string
  },
  data?: Record<string, string>,
) {
  // Only run on server
  if (typeof window !== "undefined") {
    throw new Error("sendFCMNotification can only be called from server-side code")
  }

  try {
    const app = getFirebaseAdmin()
    if (!app) {
      throw new Error("Firebase Admin not initialized")
    }

    const messaging = admin.messaging(app)

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: notification.title,
        body: notification.body,
        icon: notification.icon || "/icon-192x192.png",
        badge: notification.badge || "/icon-192x192.png",
      },
      data: data || {},
      webpush: {
        fcmOptions: {
          link: data?.url || "/",
        },
      },
    }

    const response = await messaging.sendEachForMulticast(message)

    console.log("[FCM Admin] Sent successfully:", response.successCount)
    console.log("[FCM Admin] Failed:", response.failureCount)

    return {
      success: response.successCount,
      failed: response.failureCount,
      responses: response.responses,
    }
  } catch (error) {
    console.error("[FCM Admin] Error sending notification:", error)
    throw error
  }
}
