"use client"

import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDGnypzhn6NjY4g6LtQY3DBv05BfQgOcow",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "synaptic-space-ef0ae.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "synaptic-space-ef0ae",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "synaptic-space-ef0ae.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "368632292580",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:368632292580:web:e93e7e61591753d7b4b8f1",
}

let app: FirebaseApp | undefined
let messaging: Messaging | undefined

// Initialize Firebase only in browser
export function getFirebaseApp() {
  if (typeof window === "undefined") return null

  if (!app) {
    try {
      app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    } catch (error) {
      console.error("[FCM] Error initializing app:", error)
      return null
    }
  }
  return app
}

// Get FCM Token
export async function getFCMToken(vapidKey: string): Promise<string | null> {
  if (typeof window === "undefined") return null

  try {
    const app = getFirebaseApp()
    if (!app) {
      console.error("[FCM] Firebase app not initialized")
      return null
    }

    // Check if service worker is supported
    if (!("serviceWorker" in navigator)) {
      console.warn("[FCM] Service Worker not supported")
      return null
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js")
    console.log("[FCM] Service Worker registered")

    // Get messaging instance
    messaging = getMessaging(app)

    // Request permission
    const permission = await Notification.requestPermission()
    console.log("[FCM] Notification permission:", permission)

    if (permission !== "granted") {
      console.warn("[FCM] Notification permission denied")
      return null
    }

    // Get token
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    })

    console.log("[FCM] Token obtained:", token ? "Yes" : "No")
    return token
  } catch (error) {
    console.error("[FCM] Error getting token:", error)
    return null
  }
}

// Listen for foreground messages
export function onFCMMessage(callback: (payload: any) => void) {
  if (typeof window === "undefined") return

  try {
    const app = getFirebaseApp()
    if (!app) return

    messaging = messaging || getMessaging(app)

    return onMessage(messaging, (payload) => {
      console.log("[FCM] Foreground message received:", payload)
      callback(payload)
    })
  } catch (error) {
    console.error("[FCM] Error setting up message listener:", error)
  }
}
