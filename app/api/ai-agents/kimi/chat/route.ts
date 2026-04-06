import { NextRequest, NextResponse } from "next/server"
import { createChiefAgent } from "@/lib/ai-agents/chief-agent-kimi"

export const runtime = "nodejs"
export const maxDuration = 60

// Singleton per server instance
let agentInstance: ReturnType<typeof createChiefAgent> | null = null
function getAgent(conversationId?: string) {
	if (!agentInstance || conversationId) {
		agentInstance = createChiefAgent(conversationId)
	}
	return agentInstance
}

/**
 * POST /api/ai-agents/kimi/chat
 * Chat with the Kimi-powered Chief Agent (admin only - no auth check needed, protected by admin middleware)
 */
export async function POST(req: NextRequest) {
	try {
		const { message, context, conversationId, resetHistory } = await req.json()

		if (!message) {
			return NextResponse.json(
				{ success: false, error: "الرسالة مطلوبة" },
				{ status: 400 }
			)
		}

		if (resetHistory) {
			agentInstance = null
		}

		const agent = getAgent(conversationId)
		const response = await agent.chat(message, context)

		return NextResponse.json({
			success: true,
			response,
			conversationId,
		})
	} catch (error) {
		console.error("[v0] Chief Agent kimi/chat error:", error)
		const msg = error instanceof Error ? error.message : "Unknown error"
		return NextResponse.json(
			{ success: false, error: msg, response: "عذراً، حدث خطأ في معالجة طلبك." },
			{ status: 500 }
		)
	}
}
