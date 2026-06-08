import { createServiceClient } from "@/lib/supabase/server"
import { generateDailySummaryForGroup } from "@/lib/memory/generate-daily-summary"
import { NextResponse } from "next/server"

// Nightly Vercel cron at 00:00 UTC. Generates yesterday's summary for every
// group. Note: Vercel crons run ONLY on production deployments — they do not
// fire in dev or preview. The memory page also triggers generation lazily on
// visit so the feature works everywhere.
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServiceClient()

    const { data: groups, error: groupsError } = await supabase
      .from("groups")
      .select("id")

    if (groupsError) {
      console.error("[Cron] Error fetching groups:", groupsError)
      return NextResponse.json({ error: groupsError.message }, { status: 500 })
    }

    if (!groups || groups.length === 0) {
      return NextResponse.json({ success: true, message: "No groups found" })
    }

    // Process groups sequentially to stay well under serverless time / memory
    // limits and to avoid hammering the AI provider rate limit.
    const results = []
    for (const group of groups) {
      try {
        const result = await generateDailySummaryForGroup(supabase, group.id)
        results.push(result)
      } catch (e) {
        console.error("[Cron] Error processing group", group.id, e)
        results.push({ status: "error" as const, groupId: group.id })
      }
    }

    const successCount = results.filter((r) => r.status === "success").length
    console.log(
      `[Cron] Generated ${successCount} summaries out of ${groups.length} groups`,
    )

    return NextResponse.json({
      success: true,
      message: `Generated ${successCount} summaries`,
      results,
    })
  } catch (error) {
    console.error("[Cron] Generate summaries error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
