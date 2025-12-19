"use server"

export async function getFirebaseVapidKey() {
  // VAPID key is public but Vercel flags it as sensitive
  // So we fetch it from server side to avoid deployment errors
  return process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || null
}
