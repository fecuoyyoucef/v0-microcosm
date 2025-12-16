import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/push/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        title: "إشعار تجريبي",
        body: "هذا إشعار تجريبي من Synaptic Space! 🎉",
        url: "/chat/notifications",
        data: {
          test: true,
        },
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to send test notification")
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Test Push] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
