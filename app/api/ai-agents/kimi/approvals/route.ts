import { NextRequest, NextResponse } from "next/server"
import { createApprovalSystem } from "@/lib/ai-agents/approval-system"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

/**
 * GET /api/ai-agents/kimi/approvals
 * Get pending approval requests
 */
export async function GET(req: NextRequest) {
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

		// Check if user is admin/owner
		const { data: profile } = await supabase
			.from("profiles")
			.select("role")
			.eq("id", user.id)
			.single()

		if (profile?.role !== "admin" && profile?.role !== "owner") {
			return NextResponse.json(
				{ success: false, error: "Insufficient permissions" },
				{ status: 403 }
			)
		}

		const approvalSystem = createApprovalSystem()
		const pendingRequests = await approvalSystem.getPendingRequests()

		return NextResponse.json({
			success: true,
			requests: pendingRequests,
		})
	} catch (error) {
		console.error("[v0] Error fetching approval requests:", error)
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
 * POST /api/ai-agents/kimi/approvals
 * Approve or reject a request
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

		// Check if user is admin/owner
		const { data: profile } = await supabase
			.from("profiles")
			.select("role")
			.eq("id", user.id)
			.single()

		if (profile?.role !== "admin" && profile?.role !== "owner") {
			return NextResponse.json(
				{ success: false, error: "Insufficient permissions" },
				{ status: 403 }
			)
		}

		const { requestId, action } = await req.json()

		if (!requestId || !action) {
			return NextResponse.json(
				{ success: false, error: "Request ID and action are required" },
				{ status: 400 }
			)
		}

		const approvalSystem = createApprovalSystem()

		if (action === "approve") {
			await approvalSystem.approve(requestId, user.id)
			
			// Execute the approved action
			const result = await approvalSystem.executeApprovedAction(requestId)
			
			return NextResponse.json({
				success: true,
				message: "Request approved and executed",
				result,
			})
		}

		if (action === "reject") {
			await approvalSystem.reject(requestId, user.id)
			
			return NextResponse.json({
				success: true,
				message: "Request rejected",
			})
		}

		return NextResponse.json(
			{ success: false, error: "Invalid action" },
			{ status: 400 }
		)
	} catch (error) {
		console.error("[v0] Error processing approval:", error)
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		)
	}
}
