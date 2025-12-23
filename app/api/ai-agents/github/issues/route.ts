import { type NextRequest, NextResponse } from "next/server"
import { listIssues, getIssue, createIssueComment, updateIssue } from "@/lib/ai-agents/github-agent"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: admin } = await supabase.from("admins").select("role").eq("user_id", user.id).single()

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const state = (searchParams.get("state") as "open" | "closed" | "all") || "open"
    const issueNumber = searchParams.get("number")

    if (issueNumber) {
      const issue = await getIssue(Number.parseInt(issueNumber))
      return NextResponse.json({ issue })
    }

    const issues = await listIssues(state)
    return NextResponse.json({ issues })
  } catch (error) {
    console.error("Error fetching GitHub issues:", error)
    return NextResponse.json({ error: "Failed to fetch issues" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: admin } = await supabase.from("admins").select("role").eq("user_id", user.id).single()

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { action, issueNumber, data: actionData } = body

    switch (action) {
      case "comment":
        const comment = await createIssueComment(issueNumber, actionData.body)
        return NextResponse.json({ comment })

      case "update":
        const updated = await updateIssue(issueNumber, actionData)
        return NextResponse.json({ issue: updated })

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error managing GitHub issue:", error)
    return NextResponse.json({ error: "Failed to manage issue" }, { status: 500 })
  }
}
