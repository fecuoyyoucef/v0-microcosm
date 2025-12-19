import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Return VAPID key safely from server
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || ""

    return NextResponse.json({ vapidKey })
  } catch (error) {
    console.error("[Firebase Config API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
