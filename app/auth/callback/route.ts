import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/chat"

  console.log("[v0] Callback route - code:", code ? "present" : "missing")
  console.log("[v0] Callback route - next param:", next)

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    console.log("[v0] Exchange result - error:", error?.message, "user:", data.user?.id)

    if (!error && data.user) {
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
    } else {
      console.log("[v0] Error in exchange - redirecting to error page:", error?.message)
    }
  } else {
    console.log("[v0] No code in callback, redirecting to error page")
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
