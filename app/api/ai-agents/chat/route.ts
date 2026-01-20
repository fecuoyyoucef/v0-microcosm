/**
 * Proxy Route: /api/ai-agents/chat
 * Forwards to the new Kimi-K2 system at /api/ai-agents/kimi/chat
 * Maintained for backward compatibility
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("[v0] Chat proxy: No user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    console.log("[v0] Chat proxy: Forwarding to Kimi system for user:", user.id)

    // Forward to new Kimi endpoint
    const kimiResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ai-agents/kimi/chat`,
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
    console.log("[v0] Chat proxy: Kimi response received")
    
    return NextResponse.json(data, { status: kimiResponse.status })
  } catch (error) {
    console.error("[v0] Chat proxy error:", error)
    return NextResponse.json(
      { success: false, response: "عذراً، حدث خطأ. يرجى المحاولة لاحقاً.", error: String(error) },
      { status: 500 }
    )
  }
}
