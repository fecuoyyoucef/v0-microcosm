import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: user, error: userError } = await supabase.auth.getUser()

    if (userError || !user.user) {
      return NextResponse.json({
        success: false,
        error: "Not authenticated",
        userError: userError?.message,
      })
    }

    // Check memberships
    const { data: memberships, error: membershipError } = await supabase
      .from("group_members")
      .select("groups(*)")
      .eq("user_id", user.user.id)
      .limit(1)

    // Check profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.user.id)
      .single()

    // Check survey
    const { data: survey, error: surveyError } = await supabase
      .from("user_surveys")
      .select("*")
      .eq("user_id", user.user.id)
      .single()

    return NextResponse.json({
      success: true,
      debug: {
        user_id: user.user.id,
        user_email: user.user.email,
        memberships: {
          count: memberships?.length || 0,
          error: membershipError?.message,
        },
        profile: {
          exists: !!profile,
          error: profileError?.message,
          data: profile,
        },
        survey: {
          exists: !!survey,
          error: surveyError?.message,
        },
      },
    })
  } catch (error) {
    console.error("[v0] Debug endpoint error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
