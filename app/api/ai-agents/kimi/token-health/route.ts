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
 * 
 * Request body:
 * {
 *   "action": "reset",
 *   "adminKey": "your-admin-secret-key"
 * }
 */
export async function POST(req: NextRequest) {
	try {
		// Get admin secret from headers (أكثر أماناً من الـ body)
		const adminSecret = req.headers.get("x-admin-secret") || 
			(await req.json()).adminKey

		// Verify admin key
		const expectedKey = process.env.ADMIN_SECRET_KEY
		
		if (!expectedKey) {
			console.warn("[v0] ADMIN_SECRET_KEY is not configured")
			return NextResponse.json(
				{ 
					success: false, 
					error: "Admin functionality not configured" 
				},
				{ status: 500 }
			)
		}

		// Constant-time comparison to prevent timing attacks
		const isValid = 
			adminSecret?.length === expectedKey.length &&
			adminSecret === expectedKey

		if (!isValid) {
			console.warn("[v0] Invalid admin key attempt from IP:", req.ip)
			return NextResponse.json(
				{ success: false, error: "Unauthorized - Invalid admin key" },
				{ status: 401 }
			)
		}

		const { action } = await req.json()

		if (action === "reset") {
			await resetAllTokens()
			console.log("[v0] Admin reset all HF tokens")
			return NextResponse.json({
				success: true,
				message: "All HF tokens reset successfully",
				timestamp: new Date().toISOString(),
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
