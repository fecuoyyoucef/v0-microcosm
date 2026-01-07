import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId } = await req.json()
    const targetUserId = userId || user.id

    console.log("[v0] Recalculating titles for user:", targetUserId)

    // Recalculate user stats from scratch
    const { data: activityLog } = await supabase.from("user_activity_log").select("*").eq("user_id", targetUserId)

    const { data: messages } = await supabase.from("messages").select("id").eq("sender_id", targetUserId)

    const { data: nodes } = await supabase.from("conversation_nodes").select("id").eq("created_by", targetUserId)

    const { data: votes } = await supabase.from("decision_votes").select("id").eq("user_id", targetUserId)

    const totalPoints = activityLog?.reduce((sum, log) => sum + (log.points_earned || 0), 0) || 0

    const stats = {
      user_id: targetUserId,
      total_points: totalPoints,
      messages_sent: messages?.length || 0,
      nodes_created: nodes?.length || 0,
      decisions_voted: votes?.length || 0,
      questions_answered: activityLog?.filter((a) => a.activity_type === "question_answered").length || 0,
      last_calculated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log("[v0] Calculated stats:", stats)

    // Upsert stats
    await supabase.from("user_stats").upsert(stats, {
      onConflict: "user_id",
    })

    // Check and award titles
    const { data: titles } = await supabase
      .from("titles")
      .select("*")
      .eq("is_active", true)
      .order("required_points", { ascending: true })

    if (!titles) {
      return NextResponse.json({ error: "No titles found" }, { status: 404 })
    }

    const awardedTitles = []

    for (const title of titles) {
      const { data: hasTitle } = await supabase
        .from("user_titles")
        .select("id")
        .eq("user_id", targetUserId)
        .eq("title_id", title.id)
        .maybeSingle()

      if (hasTitle) continue

      // Check points
      if (stats.total_points < title.required_points) continue

      // Check requirements
      const requirements = (title.required_activities || {}) as Record<string, number>
      let meetsRequirements = true

      for (const [key, value] of Object.entries(requirements)) {
        const statValue = (stats as any)[key] || 0
        if (statValue < value) {
          meetsRequirements = false
          break
        }
      }

      if (meetsRequirements) {
        await supabase.from("user_titles").insert({
          user_id: targetUserId,
          title_id: title.id,
          earned_at: new Date().toISOString(),
          is_visible: true,
          progress_data: {},
        })

        await supabase.from("notifications").insert({
          user_id: targetUserId,
          type: "title_earned",
          title: "لقب جديد! 🎉",
          body: `تهانينا! لقد حصلت على لقب: ${title.name_ar}`,
          data: {
            title_id: title.id,
            title_name: title.name_ar,
            title_icon: title.icon,
          },
          is_read: false,
        })

        awardedTitles.push(title)
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      awardedTitles,
    })
  } catch (error: any) {
    console.error("[v0] Error recalculating titles:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
