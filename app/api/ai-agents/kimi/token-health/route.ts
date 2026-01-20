import { NextRequest, NextResponse } from "next/server"
import { getTokenHealth, resetAllTokens, getTokenManager } from "@/lib/ai-agents/token-rotation"

/**
 * Get HF Token Health Status
 * GET /api/ai-agents/kimi/token-health
 */
export async function GET(req: NextRequest) {
	try {
		const health = getTokenHealth()
		const statuses = getTokenManager().getTokenStatuses()

		return NextResponse.json({
			success: true,
			health,
			tokens: statuses.map((s) => ({
				index: s.index + 1,
				isExhausted: s.isExhausted,
				requestCount: s.requestCount,
				lastError: s.lastError,
				lastErrorTime: s.lastErrorTime,
			})),
		})
	} catch (error) {
		console.error("[v0] Token health check error:", error)
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		)
	}
}

/**
 * Reset All Tokens (Admin Only)
 * POST /api/ai-agents/kimi/token-health
 */
export async function POST(req: NextRequest) {
	try {
		const { action, adminKey } = await req.json()

		// Simple admin key check (في الإنتاج استخدم نظام أقوى)
		if (adminKey !== process.env.ADMIN_SECRET_KEY) {
			return NextResponse.json(
				{ success: false, error: "Unauthorized" },
				{ status: 401 }
			)
		}

		if (action === "reset") {
			await resetAllTokens()
			return NextResponse.json({
				success: true,
				message: "All tokens reset successfully",
			})
		}

		return NextResponse.json(
			{ success: false, error: "Invalid action" },
			{ status: 400 }
		)
	} catch (error) {
		console.error("[v0] Token reset error:", error)
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		)
	}
}
