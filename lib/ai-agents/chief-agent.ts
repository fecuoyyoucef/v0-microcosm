import { createClient } from "@/lib/supabase/server"
import { generateText } from "ai"

export interface AgentDecision {
  action: string
  target_id: string
  reasoning: string
  confidence: number
  severity: "low" | "medium" | "high" | "critical"
  auto_execute: boolean
}

export interface AgentContext {
  user_id?: string
  group_id?: string
  message_id?: string
  report_id?: string
  additional_data?: any
}

export class ChiefAgent {
  private supabase = createClient()

  async isEnabled(): Promise<boolean> {
    const { data } = await this.supabase.from("ai_agents").select("is_active").eq("agent_type", "chief").single()

    return data?.is_active || false
  }

  async getCapabilities(): Promise<string[]> {
    const { data } = await this.supabase.from("ai_agents").select("capabilities").eq("agent_type", "chief").single()

    return data?.capabilities || []
  }

  async makeDecision(scenario: string, context: AgentContext): Promise<AgentDecision> {
    const isEnabled = await this.isEnabled()
    if (!isEnabled) {
      throw new Error("Chief Agent is disabled")
    }

    const capabilities = await this.getCapabilities()
    const memory = await this.getRelevantMemory(scenario)
    const history = await this.getSimilarCases(scenario)

    const prompt = `You are the Chief AI Agent of Synaptic Space, acting as deputy owner.

Your capabilities: ${capabilities.join(", ")}

Scenario: ${scenario}

Context: ${JSON.stringify(context, null, 2)}

Similar past cases:
${history.map((h) => `- ${h.scenario}: ${h.action} (confidence: ${h.confidence}%)`).join("\n")}

Learned rules from owner feedback:
${memory.map((m) => `- ${m.rule}`).join("\n")}

Analyze this situation and decide:
1. What action should be taken?
2. Why this action? (detailed reasoning)
3. Confidence level (0-100)?
4. Severity (low/medium/high/critical)?
5. Should this be executed automatically or need owner approval?

Respond in JSON format:
{
  "action": "action_type",
  "target_id": "id",
  "reasoning": "detailed explanation",
  "confidence": 85,
  "severity": "medium",
  "auto_execute": true
}`

    const { text } = await generateText({
      model: "xai/grok-beta",
      prompt,
      temperature: 0.3,
    })

    const decision = JSON.parse(text) as AgentDecision

    // Log the decision
    await this.logDecision(decision, context)

    return decision
  }

  async executeAction(decision: AgentDecision, context: AgentContext): Promise<boolean> {
    console.log("[v0] Chief Agent executing action:", decision.action)

    // Create snapshot before action
    const snapshot = await this.createSnapshot(decision, context)

    try {
      let success = false

      switch (decision.action) {
        case "delete_message":
          success = await this.deleteMessage(decision.target_id, snapshot.id)
          break
        case "ban_user":
          success = await this.banUser(decision.target_id, decision.reasoning, snapshot.id)
          break
        case "delete_cell":
          success = await this.deleteCell(decision.target_id, decision.reasoning, snapshot.id)
          break
        case "warn_user":
          success = await this.warnUser(decision.target_id, decision.reasoning, snapshot.id)
          break
        case "hide_content":
          success = await this.hideContent(decision.target_id, snapshot.id)
          break
        case "freeze_cell":
          success = await this.freezeCell(decision.target_id, decision.reasoning, snapshot.id)
          break
        default:
          console.error("[v0] Unknown action:", decision.action)
          return false
      }

      if (success) {
        await this.markActionComplete(snapshot.id)
      }

      return success
    } catch (error) {
      console.error("[v0] Error executing action:", error)
      await this.markActionFailed(snapshot.id, error)
      return false
    }
  }

  private async createSnapshot(decision: AgentDecision, context: AgentContext): Promise<any> {
    // Get current state before action
    let beforeState: any = {}

    if (decision.action === "delete_message") {
      const { data } = await this.supabase.from("messages").select("*").eq("id", decision.target_id).single()
      beforeState = data
    } else if (decision.action === "ban_user") {
      const { data: userData } = await this.supabase.from("profiles").select("*").eq("id", decision.target_id).single()

      const { data: memberData } = await this.supabase
        .from("group_members")
        .select("*")
        .eq("user_id", decision.target_id)

      beforeState = { user: userData, memberships: memberData }
    } else if (decision.action === "delete_cell") {
      const { data: cellData } = await this.supabase.from("groups").select("*").eq("id", decision.target_id).single()

      const { data: messagesData } = await this.supabase
        .from("messages")
        .select("id")
        .eq("group_id", decision.target_id)

      const { data: membersData } = await this.supabase
        .from("group_members")
        .select("*")
        .eq("group_id", decision.target_id)

      beforeState = {
        cell: cellData,
        message_ids: messagesData?.map((m) => m.id),
        members: membersData,
      }
    }

    const { data, error } = await this.supabase
      .from("agent_actions")
      .insert({
        agent_id: await this.getAgentId(),
        action_type: decision.action,
        target_id: decision.target_id,
        reasoning: decision.reasoning,
        confidence: decision.confidence,
        severity: decision.severity,
        before_snapshot: beforeState,
        context: context,
        status: "executing",
      })
      .select()
      .single()

    return data
  }

  private async deleteMessage(messageId: string, actionId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from("messages")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: await this.getAgentId(),
        deletion_reason: `Deleted by Chief Agent (action: ${actionId})`,
      })
      .eq("id", messageId)

    return !error
  }

  private async banUser(userId: string, reason: string, actionId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from("profiles")
      .update({
        banned_at: new Date().toISOString(),
        banned_by: await this.getAgentId(),
        ban_reason: reason,
      })
      .eq("id", userId)

    return !error
  }

  private async deleteCell(cellId: string, reason: string, actionId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from("groups")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: await this.getAgentId(),
        deletion_reason: reason,
      })
      .eq("id", cellId)

    return !error
  }

  private async warnUser(userId: string, reason: string, actionId: string): Promise<boolean> {
    // Create notification for user
    const { error } = await this.supabase.from("notifications").insert({
      user_id: userId,
      title: "تحذير من النظام",
      body: reason,
      type: "system",
      priority: "high",
    })

    return !error
  }

  private async hideContent(contentId: string, actionId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from("messages")
      .update({
        hidden_at: new Date().toISOString(),
        hidden_by: await this.getAgentId(),
      })
      .eq("id", contentId)

    return !error
  }

  private async freezeCell(cellId: string, reason: string, actionId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from("groups")
      .update({
        is_frozen: true,
        frozen_reason: reason,
        frozen_by: await this.getAgentId(),
      })
      .eq("id", cellId)

    return !error
  }

  private async markActionComplete(actionId: string): Promise<void> {
    await this.supabase
      .from("agent_actions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", actionId)
  }

  private async markActionFailed(actionId: string, error: any): Promise<void> {
    await this.supabase
      .from("agent_actions")
      .update({
        status: "failed",
        error_message: error.message || String(error),
      })
      .eq("id", actionId)
  }

  private async logDecision(decision: AgentDecision, context: AgentContext): Promise<void> {
    await this.supabase.from("agent_decisions").insert({
      agent_id: await this.getAgentId(),
      decision_type: decision.action,
      reasoning: decision.reasoning,
      confidence: decision.confidence,
      context: context,
    })
  }

  private async getAgentId(): Promise<string> {
    const { data } = await this.supabase.from("ai_agents").select("id").eq("agent_type", "chief").single()

    return data?.id || ""
  }

  private async getRelevantMemory(scenario: string): Promise<any[]> {
    const { data } = await this.supabase
      .from("agent_memory")
      .select("*")
      .eq("agent_id", await this.getAgentId())
      .order("created_at", { ascending: false })
      .limit(10)

    return data || []
  }

  private async getSimilarCases(scenario: string): Promise<any[]> {
    const { data } = await this.supabase
      .from("agent_actions")
      .select("*")
      .eq("agent_id", await this.getAgentId())
      .order("created_at", { ascending: false })
      .limit(5)

    return data || []
  }
}
