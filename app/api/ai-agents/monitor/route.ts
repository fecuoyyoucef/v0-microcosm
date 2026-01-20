/**
 * Proxy Route: /api/ai-agents/monitor
 * Forwards to the new Kimi-K2 system at /api/ai-agents/kimi/moderate
 * Maintained for backward compatibility
 */

import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("[v0] Monitor proxy: Forwarding to Kimi system")

    // Forward to new Kimi endpoint
    const kimiResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ai-agents/kimi/moderate`,
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
    console.log("[v0] Monitor proxy: Kimi response received")
    
    return NextResponse.json(data, { status: kimiResponse.status })
  } catch (error: any) {
    console.error("[v0] Monitor proxy error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
