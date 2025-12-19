import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { token, deviceInfo } = await request.json()

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Upsert token
    const { error } = await supabase.from("fcm_tokens").upsert(
      {
        user_id: userId,
        token,
        device_info: deviceInfo || {},
        last_used_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,token",
      },
    )

    if (error) {
      console.error("[FCM Subscribe] Error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    console.log("[FCM Subscribe] Token saved for user:", userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[FCM Subscribe] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
