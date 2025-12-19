import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { token, platform } = await request.json()

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // حفظ FCM token في database
    const { error } = await supabase.from("fcm_tokens").upsert(
      {
        user_id: user.id,
        token: token,
        platform: platform || "web",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,token",
      },
    )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[FCM] Subscription error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
