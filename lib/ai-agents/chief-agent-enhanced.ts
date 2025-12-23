import { createServiceClient } from "@/lib/supabase/server"
import { generateText } from "ai"

export interface ApprovalRequest {
  id: string
  decision: any
  context: any
  status: "pending" | "approved" | "rejected"
  requested_at: Date
  approved_by?: string
  approval_reason?: string
}

export class EnhancedChiefAgent {
  private supabase = createServiceClient()

  async analyzeFullSystem(query: string): Promise<any> {
    // Chief Agent can now read ALL data for complete system understanding
    const [messages, profiles, groups, groupMembers, notifications, supportTickets, activityLogs, agentActions] =
      await Promise.all([
        this.supabase.from("messages").select("*").limit(100),
        this.supabase.from("profiles").select("*"),
        this.supabase.from("groups").select("*"),
        this.supabase.from("group_members").select("*"),
        this.supabase.from("notifications").select("*").limit(50),
        this.supabase.from("support_conversations").select("*"),
        this.supabase.from("admin_activity_log").select("*").limit(100),
        this.supabase.from("agent_actions").select("*").limit(100),
      ])

    const systemState = {
      messages: messages.data,
      profiles: profiles.data,
      groups: groups.data,
      members: groupMembers.data,
      notifications: notifications.data,
      support: supportTickets.data,
      activities: activityLogs.data,
      agentHistory: agentActions.data,
    }

    // Analyze with full context
    const { text } = await generateText({
      model: "xai/grok-beta",
      prompt: `System Analysis Query: ${query}\n\nFull System State:\n${JSON.stringify(systemState, null, 2)}`,
      temperature: 0.2,
    })

    return { analysis: text, systemState }
  }

  async requestApproval(decision: any, context: any): Promise<ApprovalRequest> {
    const approvalRequest: ApprovalRequest = {
      id: crypto.randomUUID(),
      decision,
      context,
      status: "pending",
      requested_at: new Date(),
    }

    // Log approval request
    await this.supabase.from("agent_approval_requests").insert({
      id: approvalRequest.id,
      decision_data: decision,
      context_data: context,
      status: "pending",
      requested_at: new Date(),
      severity: decision.severity,
    })

    return approvalRequest
  }

  async executeApprovedAction(approvalId: string, decision: any): Promise<boolean> {
    // Get approval
    const { data: approval } = await this.supabase
      .from("agent_approval_requests")
      .select("*")
      .eq("id", approvalId)
      .single()

    if (!approval || approval.status !== "approved") {
      throw new Error("Action not approved")
    }

    // Log to audit before execution
    const auditLog = await this.logAudit("action_execution_start", {
      approval_id: approvalId,
      action: decision.action,
      target: decision.target_id,
    })

    try {
      let result = false

      // Execute with full access
      switch (decision.action) {
        case "delete_message":
          result = await this.deleteMessageFull(decision.target_id)
          break
        case "ban_user":
          result = await this.banUserFull(decision.target_id, decision.reasoning)
          break
        case "delete_cell":
          result = await this.deleteCellFull(decision.target_id)
          break
        case "modify_group":
          result = await this.modifyGroupFull(decision.target_id, decision.changes)
          break
        case "update_user_data":
          result = await this.updateUserDataFull(decision.target_id, decision.data)
          break
        case "manage_permissions":
          result = await this.managePermissionsFull(decision.target_id, decision.permissions)
          break
      }

      // Log completion
      await this.logAudit("action_execution_complete", {
        approval_id: approvalId,
        result,
      })

      return result
    } catch (error) {
      await this.logAudit("action_execution_failed", {
        approval_id: approvalId,
        error: String(error),
      })
      throw error
    }
  }

  private async logAudit(action: string, details: any): Promise<string> {
    const { data } = await this.supabase
      .from("agent_audit_logs")
      .insert({
        agent_id: await this.getAgentId(),
        action,
        details,
        timestamp: new Date(),
      })
      .select()
      .single()

    return data?.id || ""
  }

  // Unrestricted database operations
  private async deleteMessageFull(messageId: string): Promise<boolean> {
    const { error } = await this.supabase.from("messages").delete().eq("id", messageId)
    return !error
  }

  private async banUserFull(userId: string, reason: string): Promise<boolean> {
    const { error: profileError } = await this.supabase
      .from("profiles")
      .update({ banned_at: new Date().toISOString() })
      .eq("id", userId)

    const { error: memberError } = await this.supabase.from("group_members").delete().eq("user_id", userId)

    const { error: tokenError } = await this.supabase.from("fcm_tokens").delete().eq("user_id", userId)

    return !profileError && !memberError && !tokenError
  }

  private async deleteCellFull(groupId: string): Promise<boolean> {
    const { error: messageError } = await this.supabase.from("messages").delete().eq("group_id", groupId)

    const { error: memberError } = await this.supabase.from("group_members").delete().eq("group_id", groupId)

    const { error: groupError } = await this.supabase.from("groups").delete().eq("id", groupId)

    return !messageError && !memberError && !groupError
  }

  private async modifyGroupFull(groupId: string, changes: any): Promise<boolean> {
    const { error } = await this.supabase.from("groups").update(changes).eq("id", groupId)
    return !error
  }

  private async updateUserDataFull(userId: string, data: any): Promise<boolean> {
    const { error } = await this.supabase.from("profiles").update(data).eq("id", userId)
    return !error
  }

  private async managePermissionsFull(groupId: string, permissions: any): Promise<boolean> {
    const { error } = await this.supabase.from("groups").update({ settings: { permissions } }).eq("id", groupId)
    return !error
  }

  private async getAgentId(): Promise<string> {
    const { data } = await this.supabase.from("ai_agents").select("id").eq("agent_type", "chief").single()
    return data?.id || ""
  }
}
