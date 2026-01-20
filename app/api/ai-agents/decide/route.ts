/**
 * Proxy Route: /api/ai-agents/decide
 * Forwards to the new Kimi-K2 system at /api/ai-agents/kimi/decide
 * Maintained for backward compatibility
 */

import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify owner
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("is_owner").eq("id", user.id).single()

    if (!profile?.is_owner) {
      return NextResponse.json({ error: "Only owner can use Chief Agent" }, { status: 403 })
    }

    const body = await request.json()

    console.log("[v0] Decide proxy: Forwarding to Kimi system for owner:", user.id)

    // Forward to new Kimi endpoint
    const kimiResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ai-agents/kimi/decide`,
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
    console.log("[v0] Decide proxy: Kimi response received")
    
    return NextResponse.json(data, { status: kimiResponse.status })
  } catch (error: any) {
    console.error("[v0] Decide proxy error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
