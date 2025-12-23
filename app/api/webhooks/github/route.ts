import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get("x-hub-signature-256")
    const body = await request.text()

    if (process.env.GITHUB_WEBHOOK_SECRET) {
      const hmac = crypto.createHmac("sha256", process.env.GITHUB_WEBHOOK_SECRET)
      const digest = "sha256=" + hmac.update(body).digest("hex")

      if (signature !== digest) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    const payload = JSON.parse(body)
    const event = request.headers.get("x-github-event")

    const supabase = await createClient()

    // Log event
    await supabase.from("github_events").insert({
      event_type: event,
      payload,
      created_at: new Date().toISOString(),
    })

    // Handle different events
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

      case "code_scanning_alert":
        await handleSecurityAlert(payload, supabase)
        break
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}

async function handleIssueEvent(payload: any, supabase: any) {
  if (payload.action === "opened") {
    // Auto-analyze new issues
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai-agents/github/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issueBody: payload.issue.body,
        ticketId: null,
      }),
    })
  }
}

async function handlePREvent(payload: any, supabase: any) {
  // Log PR activity
  console.log(`PR ${payload.action}: ${payload.pull_request.title}`)
}

async function handlePushEvent(payload: any, supabase: any) {
  // Track commits
  console.log(`Push to ${payload.ref}: ${payload.commits.length} commits`)
}

async function handleSecurityAlert(payload: any, supabase: any) {
  // Notify admins of security issues
  console.log(`Security alert: ${payload.alert.rule.description}`)
}
