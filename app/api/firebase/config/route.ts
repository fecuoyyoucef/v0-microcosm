import { NextResponse } from "next/server"

export async function GET() {
  try {
    const config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }

    // التحقق من أن جميع المتغيرات موجودة
    if (!config.apiKey || !config.projectId || !config.messagingSenderId || !config.appId) {
      console.error("[Firebase Config API] Missing environment variables")
      return NextResponse.json({ error: "Firebase configuration incomplete" }, { status: 500 })
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error("[Firebase Config API] Error:", error)
    return NextResponse.json({ error: "Failed to load Firebase config" }, { status: 500 })
  }
}
