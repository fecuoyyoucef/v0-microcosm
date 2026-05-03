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

    // Get Chief Agent settings
    const { data: agent, error: agentError } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("agent_type", "chief")
      .single()

    if (agentError) {
      console.error("[v0] Error fetching agent:", agentError)
      return NextResponse.json({ error: agentError.message }, { status: 500 })
    }

    const { data: agentStatus } = await supabase.from("agent_status").select("*").eq("agent_id", agent.id).single()

    return NextResponse.json({
      agent: {
        ...agent,
        is_active: agentStatus?.is_active ?? agent.status === "active",
        actions_today: agentStatus?.actions_today || 0,
        accuracy_rate: agentStatus?.accuracy_rate || 100,
      },
    })
  } catch (error: any) {
    console.error("[v0] Error fetching agent settings:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { is_active, capabilities, confidence_threshold } = await request.json()

    const { data: agent } = await supabase.from("ai_agents").select("id").eq("agent_type", "chief").single()

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    const { error: agentError } = await supabase
      .from("ai_agents")
      .update({
        status: is_active ? "active" : "paused",
        capabilities: capabilities || [],
        confidence_threshold: confidence_threshold || 0.85,
        updated_at: new Date().toISOString(),
      })
      .eq("id", agent.id)

    if (agentError) {
      console.error("[v0] Error updating ai_agents:", agentError)
      return NextResponse.json({ error: agentError.message }, { status: 500 })
    }

    const { error: statusError } = await supabase
      .from("agent_status")
      .update({
        is_active: is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("agent_id", agent.id)

    if (statusError) {
      console.error("[v0] Error updating agent_status:", statusError)
      return NextResponse.json({ error: statusError.message }, { status: 500 })
    }

    const { data: updatedAgent } = await supabase.from("ai_agents").select("*").eq("id", agent.id).single()

    return NextResponse.json({
      success: true,
      agent: {
        ...updatedAgent,
        is_active: is_active,
      },
    })
  } catch (error: any) {
    console.error("[v0] Error updating agent settings:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
