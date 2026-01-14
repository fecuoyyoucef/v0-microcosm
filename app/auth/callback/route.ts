import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const error_param = searchParams.get("error")
  const error_description = searchParams.get("error_description")
  const next = searchParams.get("next") ?? "/chat"

  if (error_param) {
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?error=${encodeURIComponent(error_description || error_param)}`,
    )
  }

  if (!code) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const forwardedHost = request.headers.get("x-forwarded-host")
      const isLocalEnv = process.env.NODE_ENV === "development"

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }

    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }

  const supabase = await createClient()

  console.log("[v0] Attempting to exchange code for session")
  console.log("[v0] Code present:", !!code)

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error("[v0] Exchange code failed:", error.message, error.status)
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error.message)}`)
  }

  console.log("[v0] Session exchange successful, user:", data.user?.email)

  if (data.user) {
    const forwardedHost = request.headers.get("x-forwarded-host")
    const isLocalEnv = process.env.NODE_ENV === "development"

    // Check profile
    const { data: profile } = await supabase.from("profiles").select("id, username").eq("id", data.user.id).single()

    // Check survey
    const { data: survey } = await supabase
      .from("user_surveys")
      .select("completed_at")
      .eq("user_id", data.user.id)
      .single()

    let redirectPath = next

    if (!profile?.username && data.user.app_metadata?.provider !== "email") {
      // OAuth user without username - complete profile first
      redirectPath = "/auth/complete-profile"
    } else if (!survey?.completed_at) {
      // User without completed survey - show survey
      redirectPath = "/auth/survey"
    }

    if (isLocalEnv) {
      return NextResponse.redirect(`${origin}${redirectPath}`)
    } else if (forwardedHost) {
      return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`)
    } else {
      return NextResponse.redirect(`${origin}${redirectPath}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
