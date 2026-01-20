import { NextRequest, NextResponse } from "next/server"
import { createChiefAgent } from "@/lib/ai-agents/chief-agent-kimi"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 60

/**
 * POST /api/ai-agents/kimi/chat
 * Chat with the Kimi-powered Chief Agent
 */
export async function POST(req: NextRequest) {
	try {
		const supabase = createClient()

		// Check authentication
		const {
			data: { user },
		} = await supabase.auth.getUser()

		if (!user) {
			return NextResponse.json(
				{ success: false, error: "Unauthorized" },
				{ status: 401 }
			)
		}

		const { message, context, conversationId } = await req.json()

		if (!message) {
			return NextResponse.json(
				{ success: false, error: "Message is required" },
				{ status: 400 }
			)
		}

		console.log("[v0] Chief Agent chat request:", { message, context })

		// Create agent instance
		const agent = createChiefAgent(conversationId)

		// Get response
		const response = await agent.chat(message, context)

		return NextResponse.json({
			success: true,
			response,
			conversationId,
		})
	} catch (error) {
		console.error("[v0] Chief Agent chat error:", error)
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		)
	}
}
