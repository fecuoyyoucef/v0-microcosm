import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const error_param = searchParams.get("error")
  const error_description = searchParams.get("error_description")
  const next = searchParams.get("next") ?? "/chat"

  console.log("[v0] Callback route - code:", code ? "present" : "missing")
  console.log("[v0] Callback route - error_param:", error_param)
  console.log("[v0] Callback route - next param:", next)

  if (error_param) {
    console.log("[v0] OAuth error from provider:", error_param, error_description)
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
      console.log("[v0] No code but user authenticated, redirecting to:", next)
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

    console.log("[v0] No code and no authenticated user")
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  console.log("[v0] Exchange result - error:", error?.message, "user:", data?.user?.id)

  if (error) {
    console.log("[v0] Exchange error, redirecting to error page")
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error.message)}`)
  }

  if (data.user) {
    const forwardedHost = request.headers.get("x-forwarded-host")
    const isLocalEnv = process.env.NODE_ENV === "development"

    const { data: profile } = await supabase.from("profiles").select("id, username").eq("id", data.user.id).single()

    console.log("[v0] Profile check - username:", profile?.username, "provider:", data.user.app_metadata?.provider)

    // Determine redirect based on profile completeness
    let redirectPath = next

    // If this is an OAuth user without a username, redirect to complete profile
    if (!profile?.username && data.user.app_metadata?.provider !== "email") {
      redirectPath = "/auth/complete-profile"
    }

    console.log("[v0] Redirecting to:", redirectPath)

    if (isLocalEnv) {
      return NextResponse.redirect(`${origin}${redirectPath}`)
    } else if (forwardedHost) {
      return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`)
    } else {
      return NextResponse.redirect(`${origin}${redirectPath}`)
    }
  }

  // Fallback - shouldn't reach here normally
  console.log("[v0] No user data, redirecting to error page")
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
