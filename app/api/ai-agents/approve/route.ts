/**
 * Proxy Route: /api/ai-agents/approve
 * Forwards to the new Kimi-K2 system at /api/ai-agents/kimi/approvals
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

    const { data: profile } = await supabase.from("profiles").select("is_owner").eq("id", user.id).single()

    if (!profile?.is_owner) {
      return NextResponse.json({ error: "Only owner can approve" }, { status: 403 })
    }

    const body = await request.json()

    console.log("[v0] Approve proxy: Forwarding to Kimi system for owner:", user.id)

    // Forward to new Kimi endpoint
    const kimiResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ai-agents/kimi/approvals`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(request.headers.get("authorization") && {
            authorization: request.headers.get("authorization")!,
          }),
        },
        body: JSON.stringify({ action: "approve", ...body }),
      }
    )

    const data = await kimiResponse.json()
    console.log("[v0] Approve proxy: Kimi response received")
    
    return NextResponse.json(data, { status: kimiResponse.status })
  } catch (error: any) {
    console.error("[v0] Approve proxy error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
