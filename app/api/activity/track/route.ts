import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { trackActivity, type ActivityType } from "@/lib/activity-tracker"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { activityType, groupId, metadata } = await req.json()

    if (!activityType) {
      return NextResponse.json({ error: "Activity type required" }, { status: 400 })
    }

    await trackActivity(user.id, activityType as ActivityType, groupId, metadata)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error tracking activity:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
