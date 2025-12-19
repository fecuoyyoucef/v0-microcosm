import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { token, deviceInfo } = await request.json()

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    const supabase = await createClient()

    // التحقق من المستخدم
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // حفظ أو تحديث Token
    const { error } = await supabase.from("fcm_tokens").upsert(
      {
        user_id: user.id,
        token,
        device_info: deviceInfo || {},
        updated_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,token",
      },
    )

    if (error) {
      console.error("[Firebase Subscribe] Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Firebase Subscribe] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
