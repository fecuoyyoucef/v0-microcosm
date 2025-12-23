import { EnhancedChiefAgent } from "@/lib/ai-agents/chief-agent-enhanced"
import { createServiceClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

const agent = new EnhancedChiefAgent()
const supabase = createServiceClient()

export async function POST(req: NextRequest) {
  try {
    const { approval_id, decision, approved } = await req.json()

    if (!approved) {
      await supabase.from("agent_approval_requests").update({ status: "rejected" }).eq("id", approval_id)

      return NextResponse.json({ success: true, action: "rejected" })
    }

    // Approve and execute
    await supabase
      .from("agent_approval_requests")
      .update({ status: "approved", approved_by: req.headers.get("x-admin-id") })
      .eq("id", approval_id)

    const result = await agent.executeApprovedAction(approval_id, decision)

    return NextResponse.json({ success: true, action: "approved_and_executed", result })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
