import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { organizeGroupTopics } from "@/lib/ai/auto-topic-nodes"

async function run(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data: groups, error } = await (supabase.from("groups") as any)
    .select("id, created_by, auto_topic_nodes_enabled")
    .eq("auto_topic_nodes_enabled", true)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results = []
  for (const group of groups || []) {
    try {
      results.push(await organizeGroupTopics(supabase, group.id, group.created_by))
    } catch (groupError) {
      console.error("[AutoTopicNodes] group failed", group.id, groupError)
      await (supabase.from("auto_node_runs") as any).insert({ group_id: group.id, status: "error", error: groupError instanceof Error ? groupError.message : "Unknown error" })
      results.push({ status: "error", groupId: group.id })
    }
  }

  return NextResponse.json({ success: true, groups: groups?.length || 0, results })
}

export async function GET(request: Request) { return run(request) }
export async function POST(request: Request) { return run(request) }
