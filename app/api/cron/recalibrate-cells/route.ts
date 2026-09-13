import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { assessProjectConversation } from "@/lib/ai/project-assessment"

export const maxDuration = 300

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization")
  if (authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data: groups, error: groupsError } = await (supabase.from("groups") as any)
    .select("id, name, goal, cell_category")
    .eq("group_type", "primary")
    .order("id")

  if (groupsError) {
    console.error("[v0] Failed to load cells for recalibration", groupsError)
    return NextResponse.json({ error: "Failed to load cells" }, { status: 500 })
  }

  const results = { processed: 0, skipped: 0, failed: 0, errors: [] as string[] }

  for (const group of groups ?? []) {
    try {
      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select("id, content, created_at, sender:profiles!sender_id(display_name)")
        .eq("group_id", group.id)
        .order("created_at", { ascending: false })
        .limit(200)

      if (messagesError) throw messagesError
      if (!messages || messages.length < 5) {
        results.skipped += 1
        continue
      }

      const assessment = await assessProjectConversation({
        groupName: group.name,
        goal: group.goal,
        messages: [...messages].reverse().map((message: any) => ({
          id: message.id,
          author: message.sender?.display_name || "مستخدم",
          content: message.content,
          createdAt: message.created_at,
        })),
      })

      await (supabase.from("project_assessments") as any).insert({
        group_id: group.id,
        assessed_by: null,
        responsibility_score: Math.round(assessment.responsibilityScore),
        progress_score: Math.round(assessment.progressScore),
        confidence: assessment.confidence,
        responsibility_summary: assessment.responsibilitySummary,
        progress_summary: assessment.progressSummary,
        behavior: assessment.behavior,
        evidence: assessment.evidence,
        source_message_count: messages.length,
      })

      const { error: updateError } = await (supabase.from("groups") as any).update({
        responsibility_score: Math.round(assessment.responsibilityScore),
        progress_score: group.cell_category === "project" ? Math.round(assessment.progressScore) : null,
        metrics_last_calculated: new Date().toISOString(),
      }).eq("id", group.id)

      if (updateError) throw updateError
      results.processed += 1
    } catch (error) {
      results.failed += 1
      results.errors.push(group.id)
      console.error(`[v0] Recalibration failed for cell ${group.id}`, error)
    }
  }

  return NextResponse.json(results)
}

export async function GET(request: NextRequest) {
  return POST(request)
}
