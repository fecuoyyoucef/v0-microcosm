import { NextRequest, NextResponse } from "next/server"
import { createChiefAgent } from "@/lib/ai-agents/chief-agent-kimi"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 30

/**
 * POST /api/ai-agents/kimi/moderate
 * Moderate content using Kimi Chief Agent
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

		const { messageId } = await req.json()

		if (!messageId) {
			return NextResponse.json(
				{ success: false, error: "Message ID is required" },
				{ status: 400 }
			)
		}

		console.log("[v0] Content moderation request:", { messageId })

		// Create agent instance
		const agent = createChiefAgent()

		// Moderate content
		const result = await agent.moderateContent(messageId)

		// If violation detected, take action
		if (result.isViolation && result.action) {
			console.log("[v0] Violation detected, taking action:", result.action)
			
			// Execute moderation action
			const decision = {
				action: result.action,
				target_id: messageId,
				reasoning: result.reason || "Content violation detected",
				confidence: 90,
				severity: "high" as const,
				auto_execute: true,
			}

			await agent.executeAction(decision, { message_id: messageId })
		}

		return NextResponse.json({
			success: true,
			result,
		})
	} catch (error) {
		console.error("[v0] Content moderation error:", error)
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		)
	}
}
