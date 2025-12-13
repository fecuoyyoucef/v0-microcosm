import { createClient } from "@/lib/supabase/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") ?? "/chat"

  console.log("[v0] Confirm route - token_hash:", token_hash ? "present" : "missing")
  console.log("[v0] Confirm route - type:", type)

  // This happens when user clicks confirm link and is already verified
  if (!token_hash && !type) {
    // Check if user is already authenticated
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

    console.log("[v0] No token_hash and no authenticated user")
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }

  if (token_hash && type) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    console.log("[v0] verifyOtp result - error:", error?.message, "user:", data?.user?.id)

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host")
      const isLocalEnv = process.env.NODE_ENV === "development"

      console.log("[v0] Verification successful, redirecting to:", next)

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    } else {
      console.log("[v0] Verification error:", error.message)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
