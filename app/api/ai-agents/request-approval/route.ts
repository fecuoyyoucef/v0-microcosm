import { EnhancedChiefAgent } from "@/lib/ai-agents/chief-agent-enhanced"
import { type NextRequest, NextResponse } from "next/server"

const agent = new EnhancedChiefAgent()

export async function POST(req: NextRequest) {
  try {
    const { decision, context } = await req.json()

    const approvalRequest = await agent.requestApproval(decision, context)

    return NextResponse.json({
      success: true,
      approval_id: approvalRequest.id,
      message: "Approval request created. Awaiting owner review.",
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
