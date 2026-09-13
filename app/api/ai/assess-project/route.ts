import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { assessProjectConversation } from "@/lib/ai/project-assessment"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { groupId } = await request.json()
    if (!groupId) return NextResponse.json({ error: "groupId is required" }, { status: 400 })

    const { data: membership } = await supabase.from("group_members").select("role").eq("group_id", groupId).eq("user_id", user.id).maybeSingle()
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const [{ data: group }, { data: messages }] = await Promise.all([
      supabase.from("groups").select("id, name, goal").eq("id", groupId).single(),
      supabase.from("messages").select("id, content, created_at, sender:profiles!sender_id(display_name)").eq("group_id", groupId).order("created_at", { ascending: true }).limit(200),
    ])
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 })
    if (!messages || messages.length < 5) return NextResponse.json({ error: "Not enough messages" }, { status: 400 })

    const assessment = await assessProjectConversation({
      groupName: group.name,
      goal: group.goal,
      messages: messages.map((message: any) => ({ id: message.id, author: message.sender?.display_name || "مستخدم", content: message.content, createdAt: message.created_at })),
    })

    await (supabase.from("project_assessments") as any).insert({
      group_id: groupId,
      assessed_by: user.id,
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
      progress_score: Math.round(assessment.progressScore),
      metrics_last_calculated: new Date().toISOString(),
    }).eq("id", groupId)
    if (updateError) throw updateError

    return NextResponse.json({ assessment })
  } catch (error) {
    console.error("Project assessment error:", error)
    return NextResponse.json({ error: "Failed to assess project" }, { status: 500 })
  }
}
