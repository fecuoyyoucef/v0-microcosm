import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const subscription = await request.json()
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Save subscription to database
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        subscription: subscription,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      },
    )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Push subscription error:", error)
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 })
  }
}
