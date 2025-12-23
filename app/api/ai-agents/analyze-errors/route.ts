import { type NextRequest, NextResponse } from "next/server"
import { ErrorAnalyzer } from "@/lib/ai-agents/error-analyzer"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { ticketIds, githubConfig } = await request.json()

    // Validate admin
    const supabase = createServiceClient()
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

    // Initialize error analyzer with GitHub config
    const analyzer = new ErrorAnalyzer({
      owner: githubConfig?.owner || process.env.GITHUB_OWNER || "your-username",
      repo: githubConfig?.repo || process.env.GITHUB_REPO || "microcosm",
      token: process.env.GITHUB_TOKEN, // Optional for public repos
    })

    // Analyze errors
    if (ticketIds && ticketIds.length > 0) {
      // Analyze multiple tickets
      const patterns = await analyzer.analyzeErrorPatterns(ticketIds)
      return NextResponse.json(patterns)
    } else {
      // Get recent unresolved tickets and analyze them
      const { data: tickets } = await supabase
        .from("support_tickets")
        .select("id")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(10)

      const ids = tickets?.map((t) => t.id) || []
      const patterns = await analyzer.analyzeErrorPatterns(ids)

      return NextResponse.json(patterns)
    }
  } catch (error) {
    console.error("[AI Agent] Error analysis failed:", error)
    return NextResponse.json({ error: "Failed to analyze errors" }, { status: 500 })
  }
}
