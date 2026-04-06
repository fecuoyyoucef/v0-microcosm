import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get today's actions
    const { data: todayActions } = await supabase
      .from("agent_actions")
      .select("id")
      .gte("created_at", today.toISOString())

    // Get undone actions
    const { data: undoneActions } = await supabase.from("agent_actions").select("id").eq("status", "undone")

    // Get learning stats
    const { data: learningStats } = await supabase
      .from("agent_learning_stats")
      .select("accuracy_rate")
      .eq("agent_id", await getChiefAgentId(supabase))
      .single()

    // Get protected content count
    const { data: protectedContent } = await supabase
      .from("agent_actions")
      .select("id")
      .in("action_type", ["delete_message", "hide_content", "ban_user"])
      .eq("status", "completed")

    return NextResponse.json({
      today_actions: todayActions?.length || 0,
      undone_actions: undoneActions?.length || 0,
      accuracy_rate: Math.round(learningStats?.accuracy_rate || 0),
      protected_content: protectedContent?.length || 0,
    })
  } catch (error: any) {
    console.error("[v0] Error fetching stats:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function getChiefAgentId(supabase: any): Promise<string> {
  const { data } = await supabase.from("ai_agents").select("id").eq("agent_type", "chief").single()

  return data?.id || ""
}
