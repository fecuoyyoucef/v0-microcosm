import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { ChiefAgent } from "@/lib/ai-agents/chief-agent"

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("is_owner").eq("id", user.id).single()

    if (!profile?.is_owner) {
      return NextResponse.json({ error: "Only owner can execute" }, { status: 403 })
    }

    const { decision, context } = await request.json()

    const agent = new ChiefAgent()
    const success = await agent.executeAction(decision, context)

    return NextResponse.json({ success })
  } catch (error: any) {
    console.error("[v0] Error in execute route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
