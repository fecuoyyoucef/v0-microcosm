import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase.from("user_stats").select("*").eq("user_id", userId).single()

    if (error) {
      console.error("Error fetching user stats:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || {})
  } catch (error: any) {
    console.error("Error in stats API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
