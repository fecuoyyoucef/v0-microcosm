// API لإدارة الألقاب
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserTitles, getUserStats, setActiveTitle } from "@/lib/activity-tracker"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = req.nextUrl.searchParams
  const userId = searchParams.get("userId") || user.id

  const titles = await getUserTitles(userId)
  const stats = await getUserStats(userId)

  return NextResponse.json({ titles, stats })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { titleId } = await req.json()

  const success = await setActiveTitle(user.id, titleId)

  if (success) {
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Failed to set active title" }, { status: 500 })
}
