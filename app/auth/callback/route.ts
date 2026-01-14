import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const error_param = searchParams.get("error")
  const error_description = searchParams.get("error_description")
  const next = searchParams.get("next") ?? "/chat"

  if (error_param) {
    console.error("[v0] OAuth provider error:", error_param, error_description)
    return NextResponse.redirect(`${origin}/auth/login`)
  }

  if (!code) {
    console.error("[v0] No authorization code received")
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      console.log("[v0] User already authenticated, redirecting to:", next)
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

    return NextResponse.redirect(`${origin}/auth/login`)
  }

  const supabase = await createClient()

  console.log("[v0] Attempting to exchange code for session")

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error("[v0] Exchange code failed:", {
      message: error.message,
      status: error.status,
      name: error.name,
    })

    return NextResponse.redirect(`${origin}/auth/login`)
  }

  console.log("[v0] Session exchange successful, user:", data.user?.email)

  if (data.user) {
    const forwardedHost = request.headers.get("x-forwarded-host")
    const isLocalEnv = process.env.NODE_ENV === "development"

    const { data: profile } = await supabase.from("profiles").select("id, username").eq("id", data.user.id).single()

    const { data: survey } = await supabase
      .from("user_surveys")
      .select("completed_at")
      .eq("user_id", data.user.id)
      .single()

    let redirectPath = next

    if (!profile?.username && data.user.app_metadata?.provider !== "email") {
      redirectPath = "/auth/complete-profile"
      console.log("[v0] Redirecting OAuth user to complete profile")
    } else if (!survey?.completed_at) {
      redirectPath = "/auth/survey"
      console.log("[v0] Redirecting user to complete survey")
    }

    console.log("[v0] Final redirect path:", redirectPath)

    const response = NextResponse.redirect(
      isLocalEnv
        ? `${origin}${redirectPath}`
        : forwardedHost
          ? `https://${forwardedHost}${redirectPath}`
          : `${origin}${redirectPath}`,
    )

    const sessionCookies = request.headers.get("cookie")
    if (sessionCookies) {
      response.headers.set("Set-Cookie", sessionCookies)
    }

    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")

    return response
  }

  console.error("[v0] No user data after successful exchange")
  return NextResponse.redirect(`${origin}/auth/login`)
}
