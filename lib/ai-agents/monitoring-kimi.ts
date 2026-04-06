import { createClient } from "@/lib/supabase/server"
import type { ToolResult as ToolExecutionResult } from "./types"

/**
 * Agent Monitoring & Metrics System
 * Tracks all agent activities, performance, and decisions
 */
export class AgentMonitoring {
	private supabase = createClient()

	/**
	 * Track agent decision
	 */
	async trackDecision(params: {
		agentType: string
		context: string
		decision: string
		toolCalls: string[]
		reasoning: string
		executionTime: number
		success: boolean
		errorMessage?: string
	}): Promise<void> {
		try {
			await this.supabase.from("agent_decisions").insert({
				agent_type: params.agentType,
				context: params.context,
				decision: params.decision,
				tool_calls: params.toolCalls,
				reasoning: params.reasoning,
				executed_at: new Date().toISOString(),
				success: params.success,
				error_message: params.errorMessage,
			})

			// Update metrics
			await this.updateMetrics(params.agentType, {
				total_decisions: 1,
				successful_decisions: params.success ? 1 : 0,
				failed_decisions: params.success ? 0 : 1,
				avg_execution_time: params.executionTime,
			})
		} catch (error) {
			console.error("[v0] Error tracking decision:", error)
		}
	}

	/**
	 * Track tool execution
	 */
	async trackToolExecution(params: {
		decisionId?: string
		toolName: string
		args: any
		result: any
		success: boolean
		executionTimeMs: number
		errorMessage?: string
	}): Promise<void> {
		try {
			await this.supabase.from("tool_executions").insert({
				decision_id: params.decisionId,
				tool_name: params.toolName,
				args: params.args,
				result: params.result,
				success: params.success,
				error_message: params.errorMessage,
				executed_at: new Date().toISOString(),
				execution_time_ms: params.executionTimeMs,
			})

			// Update tool metrics
			await this.updateToolMetrics(params.toolName, {
				total_executions: 1,
				successful_executions: params.success ? 1 : 0,
				failed_executions: params.success ? 0 : 1,
				avg_execution_time_ms: params.executionTimeMs,
			})
		} catch (error) {
			console.error("[v0] Error tracking tool execution:", error)
		}
	}

	/**
	 * Track GitHub action
	 */
	async trackGitHubAction(params: {
		actionType: string
		targetType: string
		targetId: string
		success: boolean
		metadata?: any
		errorMessage?: string
	}): Promise<void> {
		try {
			await this.supabase.from("github_automated_actions").insert({
				action_type: params.actionType,
				target_type: params.targetType,
				target_id: params.targetId,
				success: params.success,
				metadata: params.metadata,
				error_message: params.errorMessage,
				executed_at: new Date().toISOString(),
			})
		} catch (error) {
			console.error("[v0] Error tracking GitHub action:", error)
		}
	}

	/**
	 * Get agent statistics
	 */
	async getAgentStats(params: {
		agentType?: string
		timeRange?: "1h" | "24h" | "7d" | "30d"
	}): Promise<{
		totalDecisions: number
		successRate: number
		avgExecutionTime: number
		mostUsedTools: Array<{ tool: string; count: number }>
		recentDecisions: any[]
	}> {
		const timeRange = params.timeRange || "24h"
		const hoursMap = { "1h": 1, "24h": 24, "7d": 168, "30d": 720 }
		const hours = hoursMap[timeRange]

		const sinceTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

		// Get decisions
		let query = this.supabase
			.from("agent_decisions")
			.select("*")
			.gte("executed_at", sinceTime)

		if (params.agentType) {
			query = query.eq("agent_type", params.agentType)
		}

		const { data: decisions } = await query.order("executed_at", {
			ascending: false,
		})

		if (!decisions || decisions.length === 0) {
			return {
				totalDecisions: 0,
				successRate: 0,
				avgExecutionTime: 0,
				mostUsedTools: [],
				recentDecisions: [],
			}
		}

		// Calculate metrics
		const totalDecisions = decisions.length
		const successfulDecisions = decisions.filter((d) => d.success).length
		const successRate = (successfulDecisions / totalDecisions) * 100

		// Get tool usage
		const toolUsage: Record<string, number> = {}
		for (const decision of decisions) {
			if (decision.tool_calls && Array.isArray(decision.tool_calls)) {
				for (const tool of decision.tool_calls) {
					toolUsage[tool] = (toolUsage[tool] || 0) + 1
				}
			}
		}

		const mostUsedTools = Object.entries(toolUsage)
			.map(([tool, count]) => ({ tool, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10)

		return {
			totalDecisions,
			successRate: Math.round(successRate * 100) / 100,
			avgExecutionTime: 0, // Would need to calculate from execution times
			mostUsedTools,
			recentDecisions: decisions.slice(0, 10),
		}
	}

	/**
	 * Get tool statistics
	 */
	async getToolStats(params: {
		toolName?: string
		timeRange?: "1h" | "24h" | "7d" | "30d"
	}): Promise<{
		totalExecutions: number
		successRate: number
		avgExecutionTimeMs: number
		recentExecutions: any[]
	}> {
		const timeRange = params.timeRange || "24h"
		const hoursMap = { "1h": 1, "24h": 24, "7d": 168, "30d": 720 }
		const hours = hoursMap[timeRange]

		const sinceTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

		// Get executions
		let query = this.supabase
			.from("tool_executions")
			.select("*")
			.gte("executed_at", sinceTime)

		if (params.toolName) {
			query = query.eq("tool_name", params.toolName)
		}

		const { data: executions } = await query.order("executed_at", {
			ascending: false,
		})

		if (!executions || executions.length === 0) {
			return {
				totalExecutions: 0,
				successRate: 0,
				avgExecutionTimeMs: 0,
				recentExecutions: [],
			}
		}

		const totalExecutions = executions.length
		const successfulExecutions = executions.filter((e) => e.success).length
		const successRate = (successfulExecutions / totalExecutions) * 100

		const totalTime = executions.reduce(
			(sum, e) => sum + (e.execution_time_ms || 0),
			0
		)
		const avgExecutionTimeMs = Math.round(totalTime / totalExecutions)

		return {
			totalExecutions,
			successRate: Math.round(successRate * 100) / 100,
			avgExecutionTimeMs,
			recentExecutions: executions.slice(0, 10),
		}
	}

	/**
	 * Get system health
	 */
	async getSystemHealth(): Promise<{
		status: "healthy" | "degraded" | "down"
		agentStatus: Record<string, boolean>
		recentErrors: any[]
		errorRate: number
	}> {
		// Check recent decisions
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

		const { data: recentDecisions } = await this.supabase
			.from("agent_decisions")
			.select("*")
			.gte("executed_at", oneHourAgo)

		const { data: recentErrors } = await this.supabase
			.from("agent_decisions")
			.select("*")
			.eq("success", false)
			.gte("executed_at", oneHourAgo)
			.limit(10)

		const totalDecisions = recentDecisions?.length || 0
		const errorCount = recentErrors?.length || 0
		const errorRate = totalDecisions > 0 ? (errorCount / totalDecisions) * 100 : 0

		// Determine health status
		let status: "healthy" | "degraded" | "down" = "healthy"
		if (errorRate > 50) {
			status = "down"
		} else if (errorRate > 20) {
			status = "degraded"
		}

		return {
			status,
			agentStatus: {
				chief: true, // Would check if agent is responsive
			},
			recentErrors: recentErrors || [],
			errorRate: Math.round(errorRate * 100) / 100,
		}
	}

	/**
	 * Update agent metrics
	 */
	private async updateMetrics(
		agentType: string,
		metrics: {
			total_decisions?: number
			successful_decisions?: number
			failed_decisions?: number
			avg_execution_time?: number
		}
	): Promise<void> {
		try {
			// Get current metrics
			const { data: current } = await this.supabase
				.from("agent_metrics")
				.select("*")
				.eq("agent_type", agentType)
				.single()

			if (current) {
				// Update existing
				await this.supabase
					.from("agent_metrics")
					.update({
						total_decisions: current.total_decisions + (metrics.total_decisions || 0),
						successful_decisions:
							current.successful_decisions + (metrics.successful_decisions || 0),
						failed_decisions:
							current.failed_decisions + (metrics.failed_decisions || 0),
						last_active_at: new Date().toISOString(),
					})
					.eq("agent_type", agentType)
			} else {
				// Insert new
				await this.supabase.from("agent_metrics").insert({
					agent_type: agentType,
					total_decisions: metrics.total_decisions || 0,
					successful_decisions: metrics.successful_decisions || 0,
					failed_decisions: metrics.failed_decisions || 0,
					last_active_at: new Date().toISOString(),
				})
			}
		} catch (error) {
			console.error("[v0] Error updating metrics:", error)
		}
	}

	/**
	 * Update tool metrics
	 */
	private async updateToolMetrics(
		toolName: string,
		metrics: {
			total_executions: number
			successful_executions: number
			failed_executions: number
			avg_execution_time_ms: number
		}
	): Promise<void> {
		// Similar to updateMetrics but for tools
		// Implementation would be similar
	}

	/**
	 * Log conversation message
	 */
	async logConversation(params: {
		conversationId: string
		role: string
		content: string
		metadata?: any
	}): Promise<void> {
		try {
			await this.supabase.from("agent_conversations").insert({
				conversation_id: params.conversationId,
				role: params.role,
				content: params.content,
				metadata: params.metadata,
				created_at: new Date().toISOString(),
			})
		} catch (error) {
			console.error("[v0] Error logging conversation:", error)
		}
	}

	/**
	 * Get conversation history
	 */
	async getConversationHistory(
		conversationId: string,
		limit = 50
	): Promise<any[]> {
		const { data } = await this.supabase
			.from("agent_conversations")
			.select("*")
			.eq("conversation_id", conversationId)
			.order("created_at", { ascending: true })
			.limit(limit)

		return data || []
	}
}

/**
 * Create monitoring instance
 */
export function createAgentMonitoring(): AgentMonitoring {
	return new AgentMonitoring()
}
