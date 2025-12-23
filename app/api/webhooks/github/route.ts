import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("x-hub-signature-256") || ""
    const body = await request.text()
    const event = request.headers.get("x-github-event") || ""

    // Verify GitHub signature
    if (process.env.GITHUB_WEBHOOK_SECRET) {
      const hmac = crypto.createHmac("sha256", process.env.GITHUB_WEBHOOK_SECRET)
      const digest = "sha256=" + hmac.update(body).digest("hex")
      if (signature !== digest) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    const payload = JSON.parse(body)
    console.log(`[v0] GitHub webhook received: ${event}`)

    // Handle different GitHub events
    if (event === "issues" && payload.action === "opened") {
      console.log(`[v0] New issue: ${payload.issue.title}`)
    }

    return NextResponse.json({ success: true, event }, { status: 200 })
  } catch (error) {
    console.error("[v0] Webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: "GitHub webhook endpoint. Use POST to send events." })
}
