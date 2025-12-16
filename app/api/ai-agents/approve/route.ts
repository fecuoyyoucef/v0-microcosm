import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("is_owner").eq("id", user.id).single()

    if (!profile?.is_owner) {
      return NextResponse.json({ error: "Only owner can approve" }, { status: 403 })
    }

    const { action_id } = await request.json()

    // Mark action as approved
    const { error } = await supabase
      .from("agent_actions")
      .update({
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", action_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Learn from approval
    const { data: action } = await supabase.from("agent_actions").select("*").eq("id", action_id).single()

    if (action) {
      await supabase.from("agent_memory").insert({
        agent_id: action.agent_id,
        memory_type: "owner_approval",
        content: {
          action_type: action.action_type,
          reasoning: action.reasoning,
          confidence: action.confidence,
          context: action.context,
          owner_approved: true,
        },
        importance: 8,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error in approve route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
