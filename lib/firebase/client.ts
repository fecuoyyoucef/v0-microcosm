"use client"

import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging"
import { getFirebaseVapidKey } from "@/app/actions/get-firebase-config"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

let app: FirebaseApp | undefined
let messaging: Messaging | undefined

export function getFirebaseApp() {
  if (typeof window === "undefined") return null

  if (getApps().length > 0) {
    return getApps()[0]
  }

  if (!firebaseConfig.apiKey) {
    console.warn("[Firebase] Firebase not configured - missing environment variables")
    return null
  }

  app = initializeApp(firebaseConfig)
  return app
}

export function getFirebaseClientMessaging() {
  if (typeof window === "undefined") return null

  const app = getFirebaseApp()
  if (!app) return null

  if (!messaging) {
    messaging = getMessaging(app)
  }

  return messaging
}

export async function requestFCMToken(): Promise<string | null> {
  try {
    console.log("[v0] [FCM Client] Requesting FCM token...")

    const messaging = getFirebaseClientMessaging()
    if (!messaging) {
      console.error("[v0] [FCM Client] Messaging not available")
      return null
    }

    const vapidKey = await getFirebaseVapidKey()
    if (!vapidKey) {
      console.error("[v0] [FCM Client] VAPID key not configured")
      return null
    }

    console.log("[v0] [FCM Client] Waiting for service worker...")
    const registration = await navigator.serviceWorker.ready
    console.log("[v0] [FCM Client] Service worker ready, getting token...")

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    })

    if (token) {
      console.log("[v0] [FCM Client] Token obtained successfully:", token.substring(0, 20) + "...")
      return token
    } else {
      console.error("[v0] [FCM Client] No token received")
      return null
    }
  } catch (error) {
    console.error("[v0] [FCM Client] Error getting token:", error)
    return null
  }
}

export function onFCMMessage(callback: (payload: any) => void) {
  const messaging = getFirebaseClientMessaging()
  if (!messaging) return () => {}

  return onMessage(messaging, (payload) => {
    console.log("[FCM] Foreground message received:", payload)
    callback(payload)
  })
}
