import { NextRequest, NextResponse } from "next/server"
import { createChiefAgent } from "@/lib/ai-agents/chief-agent-kimi"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 60

/**
 * POST /api/ai-agents/kimi/analyze-error
 * Analyze an error using Kimi Chief Agent
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

		const { error, context } = await req.json()

		if (!error) {
			return NextResponse.json(
				{ success: false, error: "Error details are required" },
				{ status: 400 }
			)
		}

		console.log("[v0] Error analysis request:", { error, context })

		// Create agent instance
		const agent = createChiefAgent()

		// Create error object
		const errorObj = new Error(error.message || error)
		if (error.stack) {
			errorObj.stack = error.stack
		}

		// Analyze error
		const analysis = await agent.analyzeAndFixError(errorObj, context)

		// Save analysis to database
		await supabase.from("error_analysis").insert({
			error_message: error.message || error,
			error_stack: error.stack,
			context,
			analysis: analysis.analysis,
			suggested_fix: analysis.suggestedFix,
			github_issue_created: analysis.githubIssueCreated,
			github_issue_url: analysis.issueUrl,
			analyzed_by: "kimi_chief_agent",
		})

		return NextResponse.json({
			success: true,
			analysis,
		})
	} catch (error) {
		console.error("[v0] Error analysis failed:", error)
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		)
	}
}
