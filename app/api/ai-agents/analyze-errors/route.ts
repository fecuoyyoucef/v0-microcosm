/**
 * Proxy Route: /api/ai-agents/analyze-errors
 * Forwards to the new Kimi-K2 system at /api/ai-agents/kimi/analyze-error
 * Maintained for backward compatibility
 */

import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: admin } = await supabase
      .from("admins")
      .select("role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single()

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()

    console.log("[v0] Error analysis proxy: Forwarding to Kimi system for admin:", user.id)

    // Forward to new Kimi endpoint
    const kimiResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ai-agents/kimi/analyze-error`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(request.headers.get("authorization") && {
            authorization: request.headers.get("authorization")!,
          }),
        },
        body: JSON.stringify(body),
      }
    )

    const data = await kimiResponse.json()
    console.log("[v0] Error analysis proxy: Kimi response received")
    
    return NextResponse.json(data, { status: kimiResponse.status })
  } catch (error) {
    console.error("[v0] Error analysis proxy error:", error)
    return NextResponse.json({ error: "Failed to analyze errors" }, { status: 500 })
  }
}
