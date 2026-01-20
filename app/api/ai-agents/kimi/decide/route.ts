import { NextRequest, NextResponse } from "next/server"
import { createChiefAgent } from "@/lib/ai-agents/chief-agent-kimi"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 60

/**
 * POST /api/ai-agents/kimi/decide
 * Make an intelligent decision using Kimi Chief Agent
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

		const { scenario, context } = await req.json()

		if (!scenario) {
			return NextResponse.json(
				{ success: false, error: "Scenario is required" },
				{ status: 400 }
			)
		}

		console.log("[v0] Chief Agent decision request:", { scenario, context })

		// Create agent instance
		const agent = createChiefAgent()

		// Check if agent is enabled
		const isEnabled = await agent.isEnabled()
		if (!isEnabled) {
			return NextResponse.json(
				{ success: false, error: "Chief Agent is disabled" },
				{ status: 403 }
			)
		}

		// Make decision
		const decision = await agent.makeDecision(scenario, context)

		// If auto-execute is enabled, execute the action
		if (decision.auto_execute) {
			console.log("[v0] Auto-executing decision:", decision.action)
			const executed = await agent.executeAction(decision, context)
			
			return NextResponse.json({
				success: true,
				decision,
				executed,
			})
		}

		// Return decision for manual execution
		return NextResponse.json({
			success: true,
			decision,
			executed: false,
		})
	} catch (error) {
		console.error("[v0] Chief Agent decision error:", error)
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		)
	}
}
