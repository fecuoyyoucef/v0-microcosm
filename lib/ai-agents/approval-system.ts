import { createClient } from "@/lib/supabase/server"
import { CHIEF_AGENT_CONFIG } from "./config"
import type { ApprovalRequest, ToolExecutionResult } from "./types"

/**
 * Approval System for High-Risk Agent Actions
 * Ensures critical actions require manual approval
 */
export class ApprovalSystem {
	private supabase = createClient()
	private highRiskActions = CHIEF_AGENT_CONFIG.approval.highRiskActions

	/**
	 * Check if action requires approval
	 */
	requiresApproval(action: string, context?: any): boolean {
		// Check if action is in high-risk list
		if (this.highRiskActions.includes(action)) {
			return true
		}

		// Additional context-based checks
		if (context) {
			// Permanent user actions always require approval
			if (action.includes("ban") && context.permanent) {
				return true
			}

			// Database deletions require approval
			if (action.includes("delete") && context.table) {
				return true
			}

			// Production changes require approval
			if (context.environment === "production") {
				return true
			}
		}

		return false
	}

	/**
	 * Assess risk level of an action
	 */
	assessRisk(action: string, details: any): "low" | "medium" | "high" | "critical" {
		// Critical risk
		if (this.highRiskActions.includes(action)) {
			return "critical"
		}

		// High risk
		if (
			action.includes("delete") ||
			action.includes("ban") ||
			action.includes("merge")
		) {
			return "high"
		}

		// Medium risk
		if (
			action.includes("update") ||
			action.includes("create_issue") ||
			action.includes("warn")
		) {
			return "medium"
		}

		// Low risk
		return "low"
	}

	/**
	 * Request approval for an action
	 */
	async requestApproval(
		action: string,
		details: any,
		requestedBy: string = "chief_agent"
	): Promise<ApprovalRequest> {
		const riskLevel = this.assessRisk(action, details)

		// Auto-approve low-risk actions
		if (riskLevel === "low" && !this.requiresApproval(action, details)) {
			return {
				id: crypto.randomUUID(),
				action,
				description: this.generateDescription(action, details),
				risk_level: riskLevel,
				requested_at: new Date(),
				status: "approved",
				requested_by: requestedBy,
				details,
			}
		}

		// Create approval request in database
		const { data, error } = await this.supabase
			.from("approval_requests")
			.insert({
				action,
				description: this.generateDescription(action, details),
				risk_level: riskLevel,
				requested_by: requestedBy,
				details,
				status: "pending",
			})
			.select()
			.single()

		if (error) {
			console.error("[v0] Error creating approval request:", error)
			throw new Error(`Failed to create approval request: ${error.message}`)
		}

		// Notify owner for critical/high risk actions
		if (["critical", "high"].includes(riskLevel)) {
			await this.notifyOwner(data)
		}

		return data
	}

	/**
	 * Check approval status
	 */
	async checkApprovalStatus(requestId: string): Promise<"pending" | "approved" | "rejected"> {
		const { data, error } = await this.supabase
			.from("approval_requests")
			.select("status")
			.eq("id", requestId)
			.single()

		if (error || !data) {
			return "pending"
		}

		return data.status
	}

	/**
	 * Approve request
	 */
	async approve(requestId: string, approvedBy: string): Promise<void> {
		const { error } = await this.supabase
			.from("approval_requests")
			.update({
				status: "approved",
				approved_by: approvedBy,
				approved_at: new Date().toISOString(),
			})
			.eq("id", requestId)

		if (error) {
			throw new Error(`Failed to approve request: ${error.message}`)
		}
	}

	/**
	 * Reject request
	 */
	async reject(requestId: string, rejectedBy: string): Promise<void> {
		const { error } = await this.supabase
			.from("approval_requests")
			.update({
				status: "rejected",
				approved_by: rejectedBy,
				approved_at: new Date().toISOString(),
			})
			.eq("id", requestId)

		if (error) {
			throw new Error(`Failed to reject request: ${error.message}`)
		}
	}

	/**
	 * Get pending approval requests
	 */
	async getPendingRequests(): Promise<ApprovalRequest[]> {
		const { data, error } = await this.supabase
			.from("approval_requests")
			.select("*")
			.eq("status", "pending")
			.order("created_at", { ascending: false })

		if (error) {
			console.error("[v0] Error fetching pending requests:", error)
			return []
		}

		return data || []
	}

	/**
	 * Generate human-readable description
	 */
	private generateDescription(action: string, details: any): string {
		const descriptions: Record<string, (d: any) => string> = {
			ban_user: (d) => `حظر المستخدم ${d.userId} ${d.permanent ? "بشكل دائم" : `لمدة ${d.duration}`}`,
			delete_cell: (d) => `حذف الخلية ${d.cellId} من قاعدة البيانات`,
			freeze_cell: (d) => `تجميد الخلية ${d.cellId} ومنع التفاعل معها`,
			merge_pr: (d) => `دمج Pull Request #${d.prNumber} في فرع ${d.targetBranch}`,
			delete_file: (d) => `حذف الملف ${d.filePath} من المستودع`,
			update_production_config: (d) => `تحديث إعدادات الإنتاج: ${JSON.stringify(d.changes)}`,
			delete_message: (d) => `حذف الرسالة ${d.messageId} من المحادثة`,
			warn_user: (d) => `تحذير المستخدم ${d.userId} بسبب: ${d.reason}`,
			create_github_issue: (d) => `إنشاء issue في GitHub بعنوان: ${d.title}`,
		}

		const descriptionFn = descriptions[action]
		if (descriptionFn) {
			return descriptionFn(details)
		}

		return `تنفيذ ${action} مع التفاصيل: ${JSON.stringify(details)}`
	}

	/**
	 * Notify owner about approval request
	 */
	private async notifyOwner(request: ApprovalRequest): Promise<void> {
		// TODO: Implement notification system
		// For now, just log
		console.log("[v0] Approval request created:", {
			id: request.id,
			action: request.action,
			riskLevel: request.risk_level,
			description: request.description,
		})

		// Could send notification via:
		// - Push notification
		// - Email
		// - In-app notification
		// - Webhook
	}

	/**
	 * Execute action after approval
	 */
	async executeApprovedAction(requestId: string): Promise<ToolExecutionResult> {
		// Get approval request
		const { data: request, error } = await this.supabase
			.from("approval_requests")
			.select("*")
			.eq("id", requestId)
			.single()

		if (error || !request) {
			return {
				success: false,
				error: "Approval request not found",
			}
		}

		// Check if approved
		if (request.status !== "approved") {
			return {
				success: false,
				error: "Action not approved",
			}
		}

		// Execute the action
		try {
			const { executeToolCall } = await import("./tool-executor")
			const result = await executeToolCall(request.action, request.details)

			// Log execution
			await this.supabase.from("tool_executions").insert({
				decision_id: null,
				tool_name: request.action,
				args: request.details,
				result,
				success: result.success,
				error_message: result.error,
				execution_time_ms: 0,
			})

			return result
		} catch (error) {
			console.error("[v0] Error executing approved action:", error)
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			}
		}
	}
}

/**
 * Create approval system instance
 */
export function createApprovalSystem(): ApprovalSystem {
	return new ApprovalSystem()
}
