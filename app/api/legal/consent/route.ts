import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { recordUserConsent, getActiveDocument } from "@/lib/supabase/legal-documents"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get active document versions
    const privacyPolicy = await getActiveDocument("privacy_policy")
    const termsOfService = await getActiveDocument("terms_of_service")

    if (!privacyPolicy || !termsOfService) {
      return NextResponse.json({ error: "Legal documents not found" }, { status: 500 })
    }

    // Get IP and user agent
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    // Record consent
    const result = await recordUserConsent(user.id, privacyPolicy.version, termsOfService.version, ipAddress, userAgent)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error recording consent:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
