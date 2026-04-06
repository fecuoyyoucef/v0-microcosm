import { createServiceClient } from "@/lib/supabase/server"
import { KimiAgentClient } from "./kimi-client"
import { ApprovalSystem } from "./approval-system"
import { CHIEF_AGENT_CONFIG } from "./config"
import type { AgentContext, ConversationContext } from "./types"

// Local AgentDecision type compatible with this agent's usage
interface AgentDecision {
	action: string
	target_id: string
	reasoning: string
	confidence: number
	severity: "low" | "medium" | "high" | "critical"
	auto_execute: boolean
	tool_calls_used?: string[]
}

/**
 * Chief Agent - Kimi-K2 Powered
 * Main decision-making agent with full tool access
 */
export class ChiefAgent {
	private supabase = createServiceClient()
	private agent: KimiAgentClient
	private approvalSystem: ApprovalSystem

	constructor(conversationId?: string) {
		const systemPrompt = this.buildSystemPrompt()
		this.agent = new KimiAgentClient(systemPrompt, conversationId)
		this.approvalSystem = new ApprovalSystem()
	}

	/**
	 * Build comprehensive system prompt
	 */
	private buildSystemPrompt(): string {
		return `أنت الوكيل الرئيسي (Chief Agent) لتطبيق Microcosm - شبكة اجتماعية عربية مبتكرة.

# دورك ومسؤولياتك

أنت نائب المالك وتتمتع بصلاحيات واسعة:

## 1. إدارة المحتوى والإشراف
- مراقبة المحتوى وكشف المخالفات
- حذف أو إخفاء المحتوى المخالف
- تحذير المستخدمين
- حظر المستخدمين عند الضرورة

## 2. إدارة GitHub
- تحليل الأخطاء البرمجية
- البحث في الكود المصدري
- إنشاء Issues تلقائياً للأخطاء
- التعليق على Issues
- اقتراح إصلاحات
- إنشاء Pull Requests (تحتاج موافقة)
- فحص الأمان

## 3. إدارة قاعدة البيانات
- الاستعلام عن البيانات
- تحديث السجلات
- تحليل الأداء
- إدارة المستخدمين والخلايا

## 4. المراقبة والتحليل
- مراقبة صحة النظام
- تحليل الأداء
- كشف الأنماط الشاذة
- تقديم تقارير

## 5. اتخاذ القرارات الذكية
- تحليل المواقف بعناية
- جمع المعلومات اللازمة
- استخدام الأدوات المناسبة
- تنفيذ الحلول الأمثل
- المراقبة والتعلم من النتائج

# الأدوات المتاحة

لديك وصول كامل إلى:

## GitHub Tools:
- read_file: قراءة ملف من المستودع
- search_code: البحث في الكود
- list_files: عرض الملفات
- create_issue: إنشاء issue
- comment_on_issue: التعليق على issue
- create_pr: إنشاء pull request
- get_commit_history: تاريخ الـ commits
- analyze_security: فحص الأمان

## Database Tools:
- query_database: استعلام من قاعدة البيانات
- update_record: تحديث سجل
- delete_record: حذف سجل
- execute_rpc: تنفيذ stored procedure

## Analysis Tools:
- analyze_error: تحليل خطأ
- find_similar_issues: البحث عن مشاكل مشابهة
- suggest_fix: اقتراح إصلاح

## Monitoring Tools:
- get_system_health: صحة النظام
- check_performance: فحص الأداء
- get_error_logs: سجلات الأخطاء

## Moderation Tools:
- check_content: فحص محتوى
- delete_message: حذف رسالة
- warn_user: تحذير مستخدم
- ban_user: حظر مستخدم (يحتاج موافقة)

## Notification Tools:
- send_notification: إرسال إشعار
- create_alert: إنشاء تنبيه
- notify_admin: إشعار المسؤول

# طريقة العمل

عند استلام طلب:

1. **فهم السياق**: افهم المشكلة أو الطلب بشكل كامل
2. **جمع المعلومات**: استخدم الأدوات لجمع البيانات اللازمة
3. **التحليل**: حلل المعلومات بعناية
4. **اتخاذ القرار**: اختر الإجراء المناسب
5. **التنفيذ**: نفذ الإجراء باستخدام الأدوات
6. **المتابعة**: تأكد من نجاح الإجراء

# استخدام الأدوات

عند الحاجة لاستخدام أداة، أعط الرد بهذا التنسيق:

\`\`\`json
{
  "tool_name": "اسم_الأداة",
  "arguments": {
    "param1": "value1",
    "param2": "value2"
  }
}
\`\`\`

يمكنك استخدام عدة أدوات في وقت واحد:

\`\`\`json
[
  {
    "tool_name": "read_file",
    "arguments": {"path": "src/app.ts"}
  },
  {
    "tool_name": "search_code",
    "arguments": {"query": "error handling"}
  }
]
\`\`\`

# الإجراءات عالية المخاطر

الإجراءات التالية تحتاج موافقة المالك:
- حظر مستخدم نهائياً
- حذف خلية
- تجميد خلية
- دمج Pull Request
- حذف ملفات
- تعديل إعدادات الإنتاج

للإجراءات الأخرى، يمكنك التنفيذ مباشرة.

# المبادئ الأساسية

1. **الشفافية**: وثق كل قراراتك وأفعالك
2. **الحذر**: كن حذراً مع الإجراءات عالية المخاطر
3. **التعلم**: تعلم من كل موقف
4. **الكفاءة**: استخدم أقل عدد من الأدوات للوصول للهدف
5. **الأمان**: احمِ بيانات المستخدمين دائماً

# اللغة

- تحدث بالعربية بشكل طبيعي
- استخدم مصطلحات تقنية واضحة
- اشرح قراراتك بوضوح

الآن أنت جاهز للعمل!`
	}

	/**
	 * Check if agent is enabled
	 */
	async isEnabled(): Promise<boolean> {
		const { data } = await this.supabase
			.from("ai_agents")
			.select("is_active")
			.eq("agent_type", "chief")
			.single()

		return data?.is_active || false
	}

	/**
	 * Get agent capabilities
	 */
	async getCapabilities(): Promise<string[]> {
		const { data } = await this.supabase
			.from("ai_agents")
			.select("capabilities")
			.eq("agent_type", "chief")
			.single()

		return data?.capabilities || []
	}

	/**
	 * Make an intelligent decision
	 */
	async makeDecision(
		scenario: string,
		context: AgentContext
	): Promise<AgentDecision> {
		const isEnabled = await this.isEnabled()
		if (!isEnabled) {
			throw new Error("Chief Agent is disabled")
		}

		// Build conversation context
		const conversationContext: ConversationContext = {
			github: CHIEF_AGENT_CONFIG.github,
			database: {
				connection: "supabase",
			},
			metadata: context,
		}

		// Get relevant memory and history
		const memory = await this.getRelevantMemory(scenario)
		const history = await this.getSimilarCases(scenario)

		// Build enhanced message
		const message = `# السيناريو
${scenario}

# السياق
${JSON.stringify(context, null, 2)}

# حالات مشابهة سابقة
${history.map((h) => `- ${h.action_type}: ${h.reasoning} (ثقة: ${h.confidence}%)`).join("\n")}

# قواعد مستفادة من المالك
${memory.map((m) => `- ${m.memory_data?.rule || "قاعدة"}`).join("\n")}

# المطلوب
قم بتحليل هذا الموقف واتخاذ القرار المناسب:
1. ما الإجراء الذي يجب اتخاذه؟
2. لماذا هذا الإجراء؟ (تفصيل الأسباب)
3. مستوى الثقة (0-100)؟
4. مستوى الخطورة (low/medium/high/critical)؟
5. هل يمكن التنفيذ تلقائياً أم يحتاج موافقة المالك؟

استخدم الأدوات المناسبة لجمع المعلومات قبل اتخاذ القرار.`

		// Get response from Kimi
		const response = await this.agent.chat(message, conversationContext)

		// Parse decision from response
		const decision = this.parseDecision(response.response, context)

		// Add tool calls info
		decision.tool_calls_used = response.toolCalls.map((t) => t.name)

		// Log the decision
		await this.logDecision(decision, context, response)

		return decision
	}

	/**
	 * Parse decision from Kimi's response
	 */
	private parseDecision(
		response: string,
		context: AgentContext
	): AgentDecision {
		// Try to extract structured data
		const decision: AgentDecision = {
			action: "unknown",
			target_id: context.message_id || context.user_id || context.group_id || "",
			reasoning: response,
			confidence: 70,
			severity: "medium",
			auto_execute: false,
		}

		// Extract action
		const actionMatch = response.match(
			/action[:\s]+([a-z_]+)|الإجراء[:\s]+([a-z_]+)/i
		)
		if (actionMatch) {
			decision.action = actionMatch[1] || actionMatch[2]
		}

		// Extract confidence
		const confidenceMatch = response.match(/confidence[:\s]+(\d+)|ثقة[:\s]+(\d+)/i)
		if (confidenceMatch) {
			decision.confidence = Number.parseInt(confidenceMatch[1] || confidenceMatch[2])
		}

		// Extract severity
		const severityMatch = response.match(
			/severity[:\s]+(low|medium|high|critical)|خطورة[:\s]+(منخفض|متوسط|عالي|حرج)/i
		)
		if (severityMatch) {
			const severity = severityMatch[1] || severityMatch[2]
			const severityMap: Record<string, "low" | "medium" | "high" | "critical"> = {
				low: "low",
				منخفض: "low",
				medium: "medium",
				متوسط: "medium",
				high: "high",
				عالي: "high",
				critical: "critical",
				حرج: "critical",
			}
			decision.severity = severityMap[severity.toLowerCase()] || "medium"
		}

		// Extract auto_execute
		const autoMatch = response.match(
			/auto[_-]execute[:\s]+(true|false)|تنفيذ تلقائي[:\s]+(نعم|لا)/i
		)
		if (autoMatch) {
			const value = autoMatch[1] || autoMatch[2]
			decision.auto_execute =
				value === "true" || value === "نعم"
		}

		// Check if action needs approval
		const needsApproval = this.approvalSystem.requiresApproval(
			decision.action,
			context
		)
		if (needsApproval) {
			decision.auto_execute = false
		}

		return decision
	}

	/**
	 * Execute an action
	 */
	async executeAction(
		decision: AgentDecision,
		context: AgentContext
	): Promise<boolean> {
		console.log("[v0] Chief Agent executing action:", decision.action)

		// Check if needs approval
		const needsApproval = this.approvalSystem.requiresApproval(
			decision.action,
			context
		)

		if (needsApproval && !decision.auto_execute) {
			// Request approval
			const approvalRequest = await this.approvalSystem.requestApproval(
				decision.action,
				{ ...context, reasoning: decision.reasoning },
				"chief_agent"
			)

			console.log(
				"[v0] Action requires approval. Request ID:",
				approvalRequest.id
			)

			// Don't execute, wait for approval
			return false
		}

		// Create snapshot before action
		const snapshot = await this.createSnapshot(decision, context)

		try {
			// Let Kimi execute the action using tools
			const message = `نفذ الإجراء التالي:

الإجراء: ${decision.action}
الهدف: ${decision.target_id}
السبب: ${decision.reasoning}

استخدم الأدوات المناسبة لتنفيذ هذا الإجراء.`

			const response = await this.agent.chat(message)

			// Check if successful based on response
			const success = !response.response.toLowerCase().includes("error") &&
				!response.response.includes("فشل")

			if (success) {
				await this.markActionComplete(snapshot.id)
			} else {
				await this.markActionFailed(snapshot.id, new Error(response.response))
			}

			return success
		} catch (error) {
			console.error("[v0] Error executing action:", error)
			await this.markActionFailed(snapshot.id, error)
			return false
		}
	}

	/**
	 * Analyze an error and suggest fix
	 */
	async analyzeAndFixError(
		error: Error,
		context: any
	): Promise<{
		analysis: string
		suggestedFix: string
		githubIssueCreated?: boolean
		issueUrl?: string
	}> {
		const message = `حدث خطأ في النظام يحتاج تحليلاً:

# الخطأ
${error.message}

# Stack Trace
${error.stack}

# السياق
${JSON.stringify(context, null, 2)}

# المطلوب
1. حلل سبب الخطأ بعمق
2. ابحث في الكود عن الملفات المتعلقة
3. اقترح إصلاحاً مفصلاً
4. أنشئ GitHub issue إذا كان الخطأ خطير

استخدم أدوات GitHub للبحث والتحليل.`

		const response = await this.agent.chat(message)

		// Check if GitHub issue was created
		const issueCreated = response.toolCalls.some((t) => t.name === "create_issue")
		let issueUrl: string | undefined

		if (issueCreated) {
			// Extract issue URL from response
			const urlMatch = response.response.match(/https:\/\/github\.com\/[^\s]+/)
			if (urlMatch) {
				issueUrl = urlMatch[0]
			}
		}

		return {
			analysis: response.response,
			suggestedFix: response.reasoning || "راجع التحليل الكامل",
			githubIssueCreated: issueCreated,
			issueUrl,
		}
	}

	/**
	 * Moderate content
	 */
	async moderateContent(
		messageId: string
	): Promise<{
		isViolation: boolean
		reason?: string
		action?: string
	}> {
		// Fetch message
		const { data: message } = await this.supabase
			.from("messages")
			.select("*")
			.eq("id", messageId)
			.single()

		if (!message) {
			return { isViolation: false }
		}

		const moderationMessage = `راجع هذه الرسالة وحدد إذا كانت تنتهك سياسات المجتمع:

# المحتوى
"${message.content}"

# الصور
${message.image_urls?.length || 0} صورة

# الملفات
${message.file_urls?.length || 0} ملف

# سياسات المجتمع
- ممنوع المحتوى المسيء
- ممنوع التحرش
- ممنوع العنف
- ممنوع المحتوى الإباحي
- ممنوع السبام

هل تنتهك هذه الرسالة أي سياسة؟ إذا نعم، ما الإجراء المناسب؟`

		const response = await this.agent.chat(moderationMessage)

		// Parse moderation result
		const isViolation =
			response.response.includes("تنتهك") ||
			response.response.includes("مخالف") ||
			response.response.includes("violation")

		return {
			isViolation,
			reason: isViolation ? response.reasoning : undefined,
			action: isViolation ? response.toolCalls[0]?.name : undefined,
		}
	}

	/**
	 * Chat with agent
	 */
	async chat(message: string, context?: ConversationContext): Promise<string> {
		const response = await this.agent.chat(message, context)
		return response.response
	}

	/**
	 * Stream chat responses
	 */
	async *streamChat(
		message: string,
		context?: ConversationContext
	): AsyncGenerator<string> {
		yield* this.agent.streamChat(message, context)
	}

	// ==================== Helper Methods ====================

	private async createSnapshot(
		decision: AgentDecision,
		context: AgentContext
	): Promise<any> {
		let beforeState: any = {}

		// Capture state based on action type
		if (decision.action === "delete_message" && context.message_id) {
			const { data } = await this.supabase
				.from("messages")
				.select("*")
				.eq("id", context.message_id)
				.single()
			beforeState = data
		} else if (decision.action === "ban_user" && context.user_id) {
			const { data: userData } = await this.supabase
				.from("profiles")
				.select("*")
				.eq("id", context.user_id)
				.single()

			const { data: memberData } = await this.supabase
				.from("group_members")
				.select("*")
				.eq("user_id", context.user_id)

			beforeState = { user: userData, memberships: memberData }
		}

		const { data } = await this.supabase
			.from("agent_decisions")
			.insert({
				agent_type: "chief",
				context: JSON.stringify(context),
				decision: decision.action,
				tool_calls: decision.tool_calls_used || [],
				reasoning: decision.reasoning,
				executed_at: new Date().toISOString(),
				success: true,
			})
			.select()
			.single()

		return data
	}

	private async markActionComplete(actionId: string): Promise<void> {
		await this.supabase
			.from("agent_decisions")
			.update({
				success: true,
			})
			.eq("id", actionId)
	}

	private async markActionFailed(actionId: string, error: any): Promise<void> {
		await this.supabase
			.from("agent_decisions")
			.update({
				success: false,
				error_message: error instanceof Error ? error.message : String(error),
			})
			.eq("id", actionId)
	}

	private async logDecision(
		decision: AgentDecision,
		context: AgentContext,
		response: any
	): Promise<void> {
		await this.supabase.from("agent_decisions").insert({
			agent_type: "chief",
			context: JSON.stringify(context),
			decision: decision.action,
			tool_calls: decision.tool_calls_used || [],
			reasoning: decision.reasoning,
			executed_at: new Date().toISOString(),
		})
	}

	private async getRelevantMemory(scenario: string): Promise<any[]> {
		const { data } = await this.supabase
			.from("agent_memory")
			.select("*")
			.order("created_at", { ascending: false })
			.limit(10)

		return data || []
	}

	private async getSimilarCases(scenario: string): Promise<any[]> {
		const { data } = await this.supabase
			.from("agent_decisions")
			.select("*")
			.eq("agent_type", "chief")
			.order("executed_at", { ascending: false })
			.limit(5)

		return data || []
	}

	/**
	 * Get agent instance
	 */
	getAgent(): KimiAgentClient {
		return this.agent
	}

	/**
	 * Get approval system
	 */
	getApprovalSystem(): ApprovalSystem {
		return this.approvalSystem
	}
}

/**
 * Create a new Chief Agent instance
 */
export function createChiefAgent(conversationId?: string): ChiefAgent {
	return new ChiefAgent(conversationId)
}
