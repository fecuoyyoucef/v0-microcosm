// API لإدارة الألقاب
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("user_titles")
      .select(
        `
        *,
        title:titles(*)
      `,
      )
      .eq("user_id", userId)
      .eq("is_visible", true)
      .order("earned_at", { ascending: false })

    if (error) {
      console.error("Error fetching user titles:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error("Error in titles API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { titleId } = await req.json()

    const { error } = await supabase.from("profiles").update({ active_title_id: titleId }).eq("id", user.id)

    if (error) {
      console.error("Error setting active title:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in set active title API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
