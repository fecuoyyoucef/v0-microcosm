import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ChiefAgent } from "@/lib/ai-agents/chief-agent"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Verify owner
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("is_owner").eq("id", user.id).single()

    if (!profile?.is_owner) {
      return NextResponse.json({ error: "Only owner can use Chief Agent" }, { status: 403 })
    }

    const { scenario, context } = await request.json()

    const agent = new ChiefAgent()
    const decision = await agent.makeDecision(scenario, context)

    // If auto_execute, execute immediately
    if (decision.auto_execute) {
      const success = await agent.executeAction(decision, context)

      return NextResponse.json({
        decision,
        executed: true,
        success,
      })
    }

    // Otherwise, return decision for owner approval
    return NextResponse.json({
      decision,
      executed: false,
      message: "Decision requires owner approval",
    })
  } catch (error: any) {
    console.error("[v0] Error in decide route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
