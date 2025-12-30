import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    const supabase = await createClient()

    const [messagesResult, nodesResult, decisionsResult, summariesResult, tasksResult, reactionsResult] =
      await Promise.all([
        // عدد الرسائل المرسلة
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("sender_id", userId),

        // عدد العقد المنشأة
        supabase
          .from("conversation_nodes")
          .select("id", { count: "exact", head: true })
          .eq("created_by", userId),

        // عدد القرارات المصوت عليها
        supabase
          .from("decision_votes")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),

        // عدد الملخصات المنشأة (node_summaries)
        supabase
          .from("node_summaries")
          .select("id, node:conversation_nodes!inner(created_by)", { count: "exact", head: true })
          .eq("node.created_by", userId),

        // عدد المهام المنجزة
        supabase
          .from("extracted_tasks")
          .select("id", { count: "exact", head: true })
          .eq("assigned_to", userId)
          .eq("status", "completed"),

        // عدد التفاعلات (reactions)
        supabase
          .from("message_reactions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
      ])

    // حساب النقاط الإجمالية من user_activity_log
    const { data: activityData } = await supabase
      .from("user_activity_log")
      .select("points_earned")
      .eq("user_id", userId)

    const totalPoints = activityData?.reduce((sum, log) => sum + (log.points_earned || 0), 0) || 0

    // إرجاع الإحصائيات المحسوبة
    const stats = {
      user_id: userId,
      total_points: totalPoints,
      messages_sent: messagesResult.count || 0,
      nodes_created: nodesResult.count || 0,
      decisions_voted: decisionsResult.count || 0,
      summaries_created: summariesResult.count || 0,
      problems_solved: tasksResult.count || 0,
      focused_messages: Math.floor((messagesResult.count || 0) * 0.3), // تقدير 30% من الرسائل مركزة
      questions_answered: Math.floor((messagesResult.count || 0) * 0.15), // تقدير 15% أجوبة
      conflicts_resolved: 0, // يحتاج implementation منفصل
      updated_at: new Date().toISOString(),
    }

    return NextResponse.json(stats)
  } catch (error: any) {
    console.error("Error in stats API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
