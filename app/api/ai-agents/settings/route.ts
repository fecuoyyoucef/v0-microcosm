import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
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
      return NextResponse.json({ error: "Only owner can access settings" }, { status: 403 })
    }

    // Get Chief Agent settings
    const { data: agent } = await supabase.from("ai_agents").select("*").eq("agent_type", "chief").single()

    return NextResponse.json({ agent })
  } catch (error: any) {
    console.error("[v0] Error fetching agent settings:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

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
      return NextResponse.json({ error: "Only owner can update settings" }, { status: 403 })
    }

    const { is_active, capabilities, confidence_threshold } = await request.json()

    const { data, error } = await supabase
      .from("ai_agents")
      .update({
        is_active,
        capabilities,
        config: { confidence_threshold },
      })
      .eq("agent_type", "chief")
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, agent: data })
  } catch (error: any) {
    console.error("[v0] Error updating agent settings:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
