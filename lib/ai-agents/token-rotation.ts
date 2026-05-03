/**
 * Hugging Face Token Rotation Manager
 * Automatically switches between HF_TOKEN1, HF_TOKEN2, HF_TOKEN3
 * when rate limits are hit
 */

import { createServiceClient } from "@/lib/supabase/server"

interface TokenStatus {
	token: string
	index: number
	lastError?: string
	lastErrorTime?: Date
	isExhausted: boolean
	requestCount: number
}

class TokenRotationManager {
	private tokens: string[] = []
	private currentTokenIndex = 0
	private tokenStatus: Map<number, TokenStatus> = new Map()
	private supabase = createServiceClient()

	constructor() {
		this.initializeTokens()
	}

	/**
	 * Initialize available tokens from environment
	 */
	private initializeTokens(): void {
		const token1 = process.env.HF_TOKEN1
		const token2 = process.env.HF_TOKEN2
		const token3 = process.env.HF_TOKEN3

		if (token1) {
			this.tokens.push(token1)
			this.tokenStatus.set(0, {
				token: token1,
				index: 0,
				isExhausted: false,
				requestCount: 0,
			})
		}

		if (token2) {
			this.tokens.push(token2)
			this.tokenStatus.set(1, {
				token: token2,
				index: 1,
				isExhausted: false,
				requestCount: 0,
			})
		}

		if (token3) {
			this.tokens.push(token3)
			this.tokenStatus.set(2, {
				token: token3,
				index: 2,
				isExhausted: false,
				requestCount: 0,
			})
		}

		if (this.tokens.length === 0) {
			throw new Error(
				"No Hugging Face tokens found. Please set HF_TOKEN1, HF_TOKEN2, or HF_TOKEN3"
			)
		}

		console.log(`[v0] Initialized ${this.tokens.length} HF tokens for rotation`)
	}

	/**
	 * Get current active token
	 */
	getCurrentToken(): string {
		if (this.tokens.length === 0) {
			throw new Error("No tokens available")
		}

		const token = this.tokens[this.currentTokenIndex]
		const status = this.tokenStatus.get(this.currentTokenIndex)

		// Increment request count
		if (status) {
			status.requestCount++
			this.tokenStatus.set(this.currentTokenIndex, status)
		}

		console.log(
			`[v0] Using HF_TOKEN${this.currentTokenIndex + 1} (Request #${status?.requestCount})`
		)

		return token
	}

	/**
	 * Get current token index (1-based for display)
	 */
	getCurrentTokenIndex(): number {
		return this.currentTokenIndex + 1
	}

	/**
	 * Mark current token as exhausted and rotate to next
	 */
	async rotateToNextToken(error?: Error): Promise<boolean> {
		const currentStatus = this.tokenStatus.get(this.currentTokenIndex)

		if (currentStatus) {
			currentStatus.isExhausted = true
			currentStatus.lastError = error?.message
			currentStatus.lastErrorTime = new Date()
			this.tokenStatus.set(this.currentTokenIndex, currentStatus)
		}

		console.log(
			`[v0] HF_TOKEN${this.currentTokenIndex + 1} exhausted. Rotating...`
		)

		// Log to database
		await this.logTokenRotation(
			this.currentTokenIndex + 1,
			error?.message || "Rate limit exceeded"
		)

		// Find next available token
		const startIndex = this.currentTokenIndex
		let attempts = 0

		while (attempts < this.tokens.length) {
			this.currentTokenIndex = (this.currentTokenIndex + 1) % this.tokens.length
			attempts++

			const nextStatus = this.tokenStatus.get(this.currentTokenIndex)

			// Check if token is not exhausted or if enough time has passed (1 hour reset)
			if (nextStatus && !this.isTokenStillExhausted(nextStatus)) {
				console.log(
					`[v0] Rotated to HF_TOKEN${this.currentTokenIndex + 1}`
				)
				return true
			}
		}

		// All tokens exhausted
		console.error("[v0] All HF tokens are exhausted!")
		await this.notifyAllTokensExhausted()

		return false
	}

	/**
	 * Check if token is still exhausted (with time-based reset)
	 */
	private isTokenStillExhausted(status: TokenStatus): boolean {
		if (!status.isExhausted) return false

		// If error was more than 1 hour ago, consider token recovered
		if (status.lastErrorTime) {
			const hoursSinceError =
				(Date.now() - status.lastErrorTime.getTime()) / (1000 * 60 * 60)

			if (hoursSinceError >= 1) {
				// Reset token status
				status.isExhausted = false
				status.lastError = undefined
				status.lastErrorTime = undefined
				status.requestCount = 0
				return false
			}
		}

		return true
	}

	/**
	 * Check if error is rate limit related
	 */
	isRateLimitError(error: Error): boolean {
		const message = error.message.toLowerCase()

		return (
			message.includes("rate limit") ||
			message.includes("quota") ||
			message.includes("429") ||
			message.includes("too many requests") ||
			message.includes("exceeded")
		)
	}

	/**
	 * Handle error and rotate if needed
	 */
	async handleError(error: Error): Promise<boolean> {
		if (this.isRateLimitError(error)) {
			console.log("[v0] Rate limit detected, rotating token...")
			return await this.rotateToNextToken(error)
		}

		// Not a rate limit error, don't rotate
		return false
	}

	/**
	 * Get all token statuses
	 */
	getTokenStatuses(): TokenStatus[] {
		return Array.from(this.tokenStatus.values())
	}

	/**
	 * Get summary of token health
	 */
	getHealthSummary(): {
		totalTokens: number
		activeTokens: number
		exhaustedTokens: number
		currentToken: number
	} {
		const statuses = this.getTokenStatuses()

		return {
			totalTokens: statuses.length,
			activeTokens: statuses.filter((s) => !s.isExhausted).length,
			exhaustedTokens: statuses.filter((s) => s.isExhausted).length,
			currentToken: this.currentTokenIndex + 1,
		}
	}

	/**
	 * Reset all tokens (admin function)
	 */
	async resetAllTokens(): Promise<void> {
		for (const [index, status] of this.tokenStatus.entries()) {
			status.isExhausted = false
			status.lastError = undefined
			status.lastErrorTime = undefined
			status.requestCount = 0
			this.tokenStatus.set(index, status)
		}

		this.currentTokenIndex = 0
		console.log("[v0] All tokens reset")
	}

	/**
	 * Log token rotation to database
	 */
	private async logTokenRotation(
		fromToken: number,
		reason: string
	): Promise<void> {
		try {
			await this.supabase.from("agent_metrics").insert({
				metric_type: "token_rotation",
				metric_value: fromToken,
				details: {
					from_token: fromToken,
					to_token: this.currentTokenIndex + 1,
					reason,
					timestamp: new Date().toISOString(),
				},
			})
		} catch (error) {
			console.error("[v0] Error logging token rotation:", error)
		}
	}

	/**
	 * Notify admin that all tokens are exhausted
	 */
	private async notifyAllTokensExhausted(): Promise<void> {
		try {
			// Log critical event
			await this.supabase.from("agent_metrics").insert({
				metric_type: "critical_error",
				metric_value: 0,
				details: {
					error: "All HF tokens exhausted",
					tokens: this.tokens.length,
					timestamp: new Date().toISOString(),
				},
			})

			// TODO: Send notification to admin (email, Discord, etc.)
			console.error("[v0] CRITICAL: All Hugging Face tokens are exhausted!")
		} catch (error) {
			console.error("[v0] Error notifying token exhaustion:", error)
		}
	}
}

// Singleton instance
let tokenManager: TokenRotationManager | null = null

/**
 * Get or create token rotation manager instance
 */
export function getTokenManager(): TokenRotationManager {
	if (!tokenManager) {
		tokenManager = new TokenRotationManager()
	}
	return tokenManager
}

/**
 * Get current active HF token
 */
export function getCurrentHFToken(): string {
	return getTokenManager().getCurrentToken()
}

/**
 * Handle HF API error with automatic rotation
 */
export async function handleHFError(error: Error): Promise<boolean> {
	return await getTokenManager().handleError(error)
}

/**
 * Get token health summary
 */
export function getTokenHealth() {
	return getTokenManager().getHealthSummary()
}

/**
 * Reset all tokens (admin only)
 */
export async function resetAllTokens(): Promise<void> {
	return await getTokenManager().resetAllTokens()
}
