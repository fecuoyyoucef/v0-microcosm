import { initializeApp, getApps, cert, type App } from "firebase-admin/app"
import { getMessaging } from "firebase-admin/messaging"

let app: App | undefined

export function getFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  // في البيئة الإنتاجية، استخدم environment variable
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : null

  if (!serviceAccount) {
    console.warn("[Firebase] Service account not configured")
    return null
  }

  app = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  })

  return app
}

export function getFirebaseMessaging() {
  const app = getFirebaseAdmin()
  if (!app) return null
  return getMessaging(app)
}
