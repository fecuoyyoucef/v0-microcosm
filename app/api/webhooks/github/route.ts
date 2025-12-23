import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("x-hub-signature-256") || ""
    const body = await request.text()
    const event = request.headers.get("x-github-event") || ""

    if (process.env.GITHUB_WEBHOOK_SECRET) {
      const hmac = crypto.createHmac("sha256", process.env.GITHUB_WEBHOOK_SECRET)
      const digest = "sha256=" + hmac.update(body).digest("hex")

      if (signature !== digest) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    const payload = JSON.parse(body)
    const supabase = createServiceClient()

    switch (event) {
      case "issues":
        await handleIssueEvent(payload, supabase)
        break

      case "pull_request":
        await handlePREvent(payload, supabase)
        break

      case "push":
        await handlePushEvent(payload, supabase)
        break

      case "security_advisory":
        await handleSecurityAdvisory(payload, supabase)
        break
    }

    return NextResponse.json({ success: true, event })
  } catch (error) {
    console.error("[v0] Webhook error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}

async function handleIssueEvent(payload: any, supabase: any) {
  if (payload.action === "opened") {
    // Trigger Chief Agent analysis for new issues
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai-agents/github/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issueTitle: payload.issue.title,
        issueBody: payload.issue.body,
        issueNumber: payload.issue.number,
        issueUrl: payload.issue.html_url,
      }),
    }).catch((err) => console.error("[v0] Analysis trigger failed:", err))
  }
}

async function handlePREvent(payload: any, supabase: any) {
  // Log PR events for Chief Agent review
  console.log(`[v0] PR ${payload.action}: ${payload.pull_request.title}`)
}

async function handlePushEvent(payload: any, supabase: any) {
  // Track commits for monitoring
  console.log(`[v0] Push to ${payload.ref}: ${payload.commits.length} commits`)
}

async function handleSecurityAdvisory(payload: any, supabase: any) {
  // Alert on security issues
  console.log(`[v0] Security alert: ${payload.security_advisory?.description}`)
}
