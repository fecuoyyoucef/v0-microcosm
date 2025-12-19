import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { token, device_info } = await request.json()

    console.log("[v0] [FCM API] Subscription request received")

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("[v0] [FCM API] Unauthorized - no user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] [FCM API] Saving token for user:", user.id)

    const { error } = await supabase.from("fcm_tokens").upsert(
      {
        user_id: user.id,
        token: token,
        device_info: device_info || {},
        updated_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,token",
      },
    )

    if (error) {
      console.error("[v0] [FCM API] Database error:", error)
      throw error
    }

    console.log("[v0] [FCM API] Token saved successfully")
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] [FCM API] Subscription error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
