import { createServiceClient } from "@/lib/supabase/server"

export class UndoSystem {
  private supabase = createServiceClient()

  async undoAction(actionId: string, ownerId: string): Promise<boolean> {
    console.log("[v0] Undoing action:", actionId)

    // Get the action details
    const { data: action, error: fetchError } = await this.supabase
      .from("agent_actions")
      .select("*")
      .eq("id", actionId)
      .single()

    if (fetchError || !action) {
      console.error("[v0] Action not found:", actionId)
      return false
    }

    if (action.status === "undone") {
      console.log("[v0] Action already undone")
      return true
    }

    try {
      let success = false

      switch (action.action_type) {
        case "delete_message":
          success = await this.restoreMessage(action)
          break
        case "ban_user":
          success = await this.unbanUser(action)
          break
        case "delete_cell":
          success = await this.restoreCell(action)
          break
        case "warn_user":
          success = await this.removeWarning(action)
          break
        case "hide_content":
          success = await this.unhideContent(action)
          break
        case "freeze_cell":
          success = await this.unfreezeCell(action)
          break
        default:
          console.error("[v0] Unknown action type:", action.action_type)
          return false
      }

      if (success) {
        // Mark action as undone
        await this.supabase
          .from("agent_actions")
          .update({
            status: "undone",
            undone_at: new Date().toISOString(),
            undone_by: ownerId,
          })
          .eq("id", actionId)

        // Learn from this undo
        await this.learnFromUndo(action, ownerId)

        console.log("[v0] Action successfully undone")
        return true
      }

      return false
    } catch (error) {
      console.error("[v0] Error undoing action:", error)
      return false
    }
  }

  private async restoreMessage(action: any): Promise<boolean> {
    const { error } = await this.supabase
      .from("messages")
      .update({
        deleted_at: null,
        deleted_by: null,
        deletion_reason: null,
      })
      .eq("id", action.target_id)

    return !error
  }

  private async unbanUser(action: any): Promise<boolean> {
    const { error } = await this.supabase
      .from("profiles")
      .update({
        banned_at: null,
        banned_by: null,
        ban_reason: null,
      })
      .eq("id", action.target_id)

    return !error
  }

  private async restoreCell(action: any): Promise<boolean> {
    const snapshot = action.before_snapshot

    if (!snapshot?.cell) {
      console.error("[v0] No snapshot found for cell restoration")
      return false
    }

    // Restore the cell
    const { error: cellError } = await this.supabase
      .from("groups")
      .update({
        deleted_at: null,
        deleted_by: null,
        deletion_reason: null,
      })
      .eq("id", action.target_id)

    if (cellError) return false

    // Restore all messages (they were soft-deleted)
    if (snapshot.message_ids && snapshot.message_ids.length > 0) {
      await this.supabase
        .from("messages")
        .update({
          deleted_at: null,
          deleted_by: null,
          deletion_reason: null,
        })
        .in("id", snapshot.message_ids)
    }

    return true
  }

  private async removeWarning(action: any): Promise<boolean> {
    // Delete the warning notification
    const { error } = await this.supabase
      .from("notifications")
      .delete()
      .eq("user_id", action.target_id)
      .eq("type", "system")
      .gte("created_at", action.created_at)

    return !error
  }

  private async unhideContent(action: any): Promise<boolean> {
    const { error } = await this.supabase
      .from("messages")
      .update({
        hidden_at: null,
        hidden_by: null,
      })
      .eq("id", action.target_id)

    return !error
  }

  private async unfreezeCell(action: any): Promise<boolean> {
    const { error } = await this.supabase
      .from("groups")
      .update({
        is_frozen: false,
        frozen_reason: null,
        frozen_by: null,
      })
      .eq("id", action.target_id)

    return !error
  }

  private async learnFromUndo(action: any, ownerId: string): Promise<void> {
    console.log("[v0] Learning from owner undo:", action.action_type)

    // Analyze why the owner disagreed
    const learningEntry = {
      agent_id: action.agent_id,
      memory_type: "owner_override",
      content: {
        action_type: action.action_type,
        reasoning: action.reasoning,
        confidence: action.confidence,
        context: action.context,
        owner_disagreed: true,
        timestamp: new Date().toISOString(),
      },
      importance: this.calculateImportance(action),
    }

    await this.supabase.from("agent_memory").insert(learningEntry)

    // Update agent learning stats
    await this.updateLearningStats(action.agent_id, "undo")
  }

  private calculateImportance(action: any): number {
    // Higher importance for high-severity actions that were undone
    const severityScore =
      {
        low: 1,
        medium: 2,
        high: 3,
        critical: 4,
      }[action.severity] || 1

    const confidenceScore = action.confidence / 100

    return Math.min(10, severityScore * (1 + confidenceScore))
  }

  private async updateLearningStats(agentId: string, outcome: "undo" | "approve"): Promise<void> {
    const { data: stats } = await this.supabase
      .from("agent_learning_stats")
      .select("*")
      .eq("agent_id", agentId)
      .single()

    if (stats) {
      const total = stats.total_decisions + 1
      const approved = outcome === "approve" ? stats.approved_decisions + 1 : stats.approved_decisions
      const accuracy = (approved / total) * 100

      await this.supabase
        .from("agent_learning_stats")
        .update({
          total_decisions: total,
          approved_decisions: approved,
          accuracy_rate: accuracy,
        })
        .eq("agent_id", agentId)
    } else {
      await this.supabase.from("agent_learning_stats").insert({
        agent_id: agentId,
        total_decisions: 1,
        approved_decisions: outcome === "approve" ? 1 : 0,
        accuracy_rate: outcome === "approve" ? 100 : 0,
      })
    }
  }

  async getActionHistory(limit = 50): Promise<any[]> {
    const { data } = await this.supabase
      .from("agent_actions")
      .select(`
        *,
        agent:ai_agents(name, agent_type)
      `)
      .order("created_at", { ascending: false })
      .limit(limit)

    return data || []
  }

  async getUndoableActions(limit = 20): Promise<any[]> {
    const { data } = await this.supabase
      .from("agent_actions")
      .select(`
        *,
        agent:ai_agents(name, agent_type)
      `)
      .in("status", ["completed", "active"])
      .order("created_at", { ascending: false })
      .limit(limit)

    return data || []
  }
}
