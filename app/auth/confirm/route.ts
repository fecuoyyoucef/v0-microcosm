import { createClient } from "@/lib/supabase/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") ?? "/chat"

  // This happens when user clicks confirm link and is already verified
  if (!token_hash && !type) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const forwardedHost = request.headers.get("x-forwarded-host")
      const isLocalEnv = process.env.NODE_ENV === "development"

      const { data: survey } = await supabase
        .from("user_surveys")
        .select("completed_at")
        .eq("user_id", user.id)
        .single()

      const redirectPath = survey?.completed_at ? next : "/auth/survey"

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

  if (token_hash && type) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error && data.user) {
      const forwardedHost = request.headers.get("x-forwarded-host")
      const isLocalEnv = process.env.NODE_ENV === "development"

      const { data: survey } = await supabase
        .from("user_surveys")
        .select("completed_at")
        .eq("user_id", data.user.id)
        .single()

      const redirectPath = survey?.completed_at ? next : "/auth/survey"

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${redirectPath}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`)
      } else {
        return NextResponse.redirect(`${origin}${redirectPath}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
