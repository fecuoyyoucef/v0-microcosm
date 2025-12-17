import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("is_owner").eq("id", user.id).single()

    if (!profile?.is_owner) {
      return NextResponse.json({ error: "Only owner can access settings" }, { status: 403 })
    }

    console.log("[v0] Fetching Chief Agent settings")

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

    console.log("[v0] Agent fetched:", agent)
    console.log("[v0] Agent status fetched:", agentStatus)

    // Merge data and convert status to is_active
    const agentData = {
      ...agent,
      is_active: agent.status === "active",
      ...agentStatus,
    }

    return NextResponse.json({ agent: agentData })
  } catch (error: any) {
    console.error("[v0] Error fetching agent settings:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("is_owner").eq("id", user.id).single()

    if (!profile?.is_owner) {
      return NextResponse.json({ error: "Only owner can update settings" }, { status: 403 })
    }

    const { is_active, capabilities, confidence_threshold } = await request.json()

    console.log("[v0] Updating Chief Agent settings:", { is_active, capabilities, confidence_threshold })

    // Update ai_agents table with status
    const { data, error } = await supabase
      .from("ai_agents")
      .update({
        status: is_active ? "active" : "paused",
        capabilities: capabilities || [],
        confidence_threshold: confidence_threshold || 0.85,
        updated_at: new Date().toISOString(),
      })
      .eq("agent_type", "chief")
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating agent:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update agent_status table as well
    await supabase
      .from("agent_status")
      .update({
        is_active: is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("agent_id", data.id)

    console.log("[v0] Agent updated successfully:", data)

    // Return data with is_active converted
    return NextResponse.json({
      success: true,
      agent: {
        ...data,
        is_active: data.status === "active",
      },
    })
  } catch (error: any) {
    console.error("[v0] Error updating agent settings:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
