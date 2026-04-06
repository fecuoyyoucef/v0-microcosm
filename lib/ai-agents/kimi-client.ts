import { InferenceClient } from "@huggingface/inference"
import { AI_MODELS, AI_CONFIG, CHIEF_AGENT_CONFIG } from "./config"
import { executeToolCall } from "./tool-executor"
import type {
	AgentMessage,
	ToolCall,
	ConversationContext,
} from "./types"

// Local AgentResponse for this client (richer than the shared type)
interface AgentResponse {
	response: string
	toolCalls: ToolCall[]
	reasoning?: string
	conversationId?: string
	executionTime?: number
}
import { createClient } from "@/lib/supabase/server"
import { getCurrentHFToken, handleHFError, getTokenManager } from "./token-rotation"

/**
 * Kimi-K2 Agentic Client with Automatic Token Rotation
 * Full wrapper for Kimi-K2-Instruct with function calling support
 * Automatically rotates between HF_TOKEN1, HF_TOKEN2, HF_TOKEN3
 */
export class KimiAgentClient {
	private client: InferenceClient
	private model: string
	private fallbackModel: string
	private conversationHistory: AgentMessage[]
	private systemPrompt: string
	private supabase = createClient()
	private conversationId?: string
	private retryCount = 0
	private maxRetries = 3

	constructor(systemPrompt: string, conversationId?: string) {
		// Get current token from rotation manager
		const currentToken = getCurrentHFToken()
		this.client = new InferenceClient(currentToken)
		this.model = AI_MODELS.PRIMARY
		this.fallbackModel = AI_MODELS.FALLBACK
		this.systemPrompt = systemPrompt
		this.conversationId = conversationId
		this.conversationHistory = [
			{
				role: "system",
				content: systemPrompt,
			},
		]
		
		console.log(`[v0] Kimi client initialized with HF_TOKEN${getTokenManager().getCurrentTokenIndex()}`)
	}
	
	/**
	 * Refresh client with new token after rotation
	 */
	private refreshClient(): void {
		const currentToken = getCurrentHFToken()
		this.client = new InferenceClient(currentToken)
		console.log(`[v0] Client refreshed with HF_TOKEN${getTokenManager().getCurrentTokenIndex()}`)
	}

	/**
	 * Main chat method with function calling support
	 */
	async chat(
		userMessage: string,
		context?: ConversationContext
	): Promise<AgentResponse> {
		const startTime = Date.now()

		try {
			// Add user message to history
			this.conversationHistory.push({
				role: "user",
				content: userMessage,
			})

			// Save to database
			if (this.conversationId) {
				await this.saveMessage("user", userMessage)
			}

			// Generate response with tool support
			const response = await this.generateWithTools(context)

			// Add assistant response to history
			this.conversationHistory.push({
				role: "assistant",
				content: response.response,
			})

			// Save to database
			if (this.conversationId) {
				await this.saveMessage("assistant", response.response, {
					tool_calls: response.toolCalls,
					reasoning: response.reasoning,
				})
			}

			const executionTime = Date.now() - startTime

			return {
				...response,
				executionTime,
			}
		} catch (error) {
			console.error("[v0] Kimi chat error:", error)

			// Check if it's a rate limit error and rotate token
			if (error instanceof Error) {
				const rotated = await handleHFError(error)
				
				if (rotated) {
					// Token rotated successfully, refresh client and retry
					this.refreshClient()
					console.log("[v0] Retrying with new token...")
					return await this.chat(userMessage, context)
				}
			}

			// Try fallback model
			if (this.retryCount < this.maxRetries) {
				this.retryCount++
				console.log(
					`[v0] Retrying with fallback model (attempt ${this.retryCount})`
				)
				return await this.chatWithFallback(userMessage, context)
			}

			throw error
		}
	}

	/**
	 * Generate response with tool calling
	 */
	private async generateWithTools(
		context?: ConversationContext
	): Promise<AgentResponse> {
		let response = ""
		let reasoning = ""
		const toolCalls: ToolCall[] = []

		// Build messages with context
		const messages = this.buildMessages(context)

		console.log("[v0] Sending request to Kimi-K2...")

		try {
			// Stream completion from Kimi
			const stream = this.client.chatCompletionStream({
				model: this.model,
				messages,
				temperature: AI_CONFIG.temperature,
				max_tokens: AI_CONFIG.maxTokens,
				top_p: AI_CONFIG.topP,
			})

			// Process stream
			for await (const chunk of stream) {
				if (chunk.choices && chunk.choices.length > 0) {
					const delta = chunk.choices[0].delta

					// Handle content
					if (delta.content) {
						response += delta.content
					}

					// Handle tool calls (if model supports it)
					if (delta.tool_calls) {
						for (const toolCall of delta.tool_calls) {
							toolCalls.push({
								id: toolCall.id || crypto.randomUUID(),
								name: toolCall.function?.name || "",
								arguments: JSON.parse(toolCall.function?.arguments || "{}"),
							})
						}
					}
				}
			}

			console.log("[v0] Received response from Kimi-K2")

			// Parse tool calls from response if not provided directly
			if (toolCalls.length === 0) {
				const parsedTools = this.parseToolCallsFromText(response)
				toolCalls.push(...parsedTools)
			}

			// Execute tool calls
			if (toolCalls.length > 0) {
				console.log(`[v0] Executing ${toolCalls.length} tool calls...`)
				await this.executeTools(toolCalls)
			}

			// Extract reasoning if present
			reasoning = this.extractReasoning(response)

			return {
				response: this.cleanResponse(response),
				toolCalls,
				reasoning,
				conversationId: this.conversationId,
			}
		} catch (error) {
			console.error("[v0] Error in generateWithTools:", error)
			throw error
		}
	}

	/**
	 * Parse tool calls from text response
	 * Kimi may output tool calls in JSON format
	 */
	private parseToolCallsFromText(text: string): ToolCall[] {
		const toolCalls: ToolCall[] = []

		// Look for JSON tool calls in markdown code blocks
		const codeBlockRegex = /```json\s*([\s\S]*?)\s*```/g
		let match

		while ((match = codeBlockRegex.exec(text)) !== null) {
			try {
				const json = JSON.parse(match[1])

				// Check if it's a tool call
				if (json.tool_name || json.function) {
					toolCalls.push({
						id: crypto.randomUUID(),
						name: json.tool_name || json.function,
						arguments: json.arguments || json.args || {},
					})
				}

				// Check if it's an array of tool calls
				if (Array.isArray(json)) {
					for (const item of json) {
						if (item.tool_name || item.function) {
							toolCalls.push({
								id: crypto.randomUUID(),
								name: item.tool_name || item.function,
								arguments: item.arguments || item.args || {},
							})
						}
					}
				}
			} catch {
				// Not valid JSON, skip
			}
		}

		return toolCalls
	}

	/**
	 * Execute multiple tool calls
	 */
	private async executeTools(toolCalls: ToolCall[]): Promise<void> {
		const maxTools = CHIEF_AGENT_CONFIG.tools.maxToolCalls
		const toolsToExecute = toolCalls.slice(0, maxTools)

		for (const toolCall of toolsToExecute) {
			try {
				console.log(`[v0] Executing tool: ${toolCall.name}`)

				const result = await executeToolCall(toolCall.name, toolCall.arguments as Record<string, any>)

				console.log(`[v0] Tool ${toolCall.name} executed successfully`)

				// Add result to conversation
				this.conversationHistory.push({
					role: "function",
					content: JSON.stringify(result),
					name: toolCall.name,
				})
			} catch (error) {
				console.error(`[v0] Tool execution error: ${toolCall.name}`, error)

				// Add error to conversation
				this.conversationHistory.push({
					role: "function",
					content: JSON.stringify({
						error: error instanceof Error ? error.message : "Unknown error",
					}),
					name: toolCall.name,
				})
			}
		}
	}

	/**
	 * Build messages array with context
	 */
	private buildMessages(context?: ConversationContext): any[] {
		const messages = [...this.conversationHistory]

		// Add context if provided
		if (context) {
			const contextMessage = this.formatContext(context)
			messages.push({
				role: "system",
				content: contextMessage,
			})
		}

		return messages
	}

	/**
	 * Format context into a message
	 */
	private formatContext(context: ConversationContext): string {
		let formatted = "Context:\n\n"

		if (context.github) {
			formatted += `GitHub:\n- Owner: ${context.github.owner}\n- Repo: ${context.github.repo}\n\n`
		}

		if (context.database) {
			formatted += `Database: ${context.database.connection}\n\n`
		}

		if (context.user) {
			formatted += `User: ${context.user.id} (${context.user.role})\n\n`
		}

		if (context.metadata) {
			formatted += `Metadata: ${JSON.stringify(context.metadata, null, 2)}\n`
		}

		return formatted
	}

	/**
	 * Extract reasoning from response
	 */
	private extractReasoning(response: string): string {
		// Look for reasoning sections
		const reasoningPatterns = [
			/reasoning:\s*(.*?)(?=\n\n|$)/is,
			/تحليل:\s*(.*?)(?=\n\n|$)/is,
			/thinking:\s*(.*?)(?=\n\n|$)/is,
		]

		for (const pattern of reasoningPatterns) {
			const match = response.match(pattern)
			if (match) {
				return match[1].trim()
			}
		}

		return ""
	}

	/**
	 * Clean response by removing tool calls and reasoning
	 */
	private cleanResponse(response: string): string {
		// Remove JSON code blocks
		let cleaned = response.replace(/```json\s*[\s\S]*?\s*```/g, "")

		// Remove reasoning sections
		cleaned = cleaned.replace(/reasoning:\s*.*?(?=\n\n|$)/gis, "")
		cleaned = cleaned.replace(/تحليل:\s*.*?(?=\n\n|$)/gis, "")
		cleaned = cleaned.replace(/thinking:\s*.*?(?=\n\n|$)/gis, "")

		return cleaned.trim()
	}

	/**
	 * Fallback to alternative model
	 */
	private async chatWithFallback(
		userMessage: string,
		context?: ConversationContext
	): Promise<AgentResponse> {
		const previousModel = this.model
		this.model = this.fallbackModel

		try {
			const response = await this.generateWithTools(context)
			this.model = previousModel // Restore original model
			return response
		} catch (error) {
			this.model = previousModel // Restore original model
			throw error
		}
	}

	/**
	 * Stream chat responses
	 */
	async *streamChat(
		userMessage: string,
		context?: ConversationContext
	): AsyncGenerator<string> {
		// Add user message to history
		this.conversationHistory.push({
			role: "user",
			content: userMessage,
		})

		// Build messages
		const messages = this.buildMessages(context)

		// Stream completion
		const stream = this.client.chatCompletionStream({
			model: this.model,
			messages,
			temperature: AI_CONFIG.temperature,
			max_tokens: AI_CONFIG.maxTokens,
		})

		for await (const chunk of stream) {
			if (chunk.choices && chunk.choices.length > 0) {
				const content = chunk.choices[0].delta.content
				if (content) {
					yield content
				}
			}
		}
	}

	/**
	 * Save message to database
	 */
	private async saveMessage(
		role: string,
		content: string,
		metadata?: any
	): Promise<void> {
		if (!this.conversationId) return

		try {
			await this.supabase.from("agent_conversations").insert({
				conversation_id: this.conversationId,
				role,
				content,
				metadata,
			})
		} catch (error) {
			console.error("[v0] Error saving message:", error)
		}
	}

	/**
	 * Get conversation history
	 */
	getHistory(): AgentMessage[] {
		return this.conversationHistory
	}

	/**
	 * Clear conversation history
	 */
	clearHistory(): void {
		this.conversationHistory = [
			{
				role: "system",
				content: this.systemPrompt,
			},
		]
	}

	/**
	 * Get current model
	 */
	getModel(): string {
		return this.model
	}

	/**
	 * Set model
	 */
	setModel(model: string): void {
		this.model = model
	}
}

/**
 * Create a new Kimi agent instance
 */
export function createKimiAgent(
	systemPrompt: string,
	conversationId?: string
): KimiAgentClient {
	return new KimiAgentClient(systemPrompt, conversationId)
}
