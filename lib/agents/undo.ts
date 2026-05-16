import { createServiceClient } from "@/lib/supabase/server"

/**
 * Undo system: every reversible agent action is logged into `agent_actions`
 * with a `before_snapshot` so an admin can roll it back later.
 */

const SUPABASE = () => createServiceClient()

export async function recordAction(params: {
  agent_id: string
  action_type: string
  target_id: string | null
  before_snapshot: Record<string, unknown> | null
  reasoning: string | null
  confidence: number | null
  severity: "low" | "medium" | "high" | "critical"
  context: Record<string, unknown> | null
}): Promise<string | null> {
  const { data, error } = await SUPABASE()
    .from("agent_actions")
    .insert({
      ...params,
      status: "completed",
    })
    .select("id")
    .single()
  if (error) {
    console.error("[agents/undo] recordAction failed:", error)
    return null
  }
  return data.id
}

export async function undoAction(actionId: string, ownerId: string): Promise<boolean> {
  const supabase = SUPABASE()
  const { data: action, error } = await supabase
    .from("agent_actions")
    .select("*")
    .eq("id", actionId)
    .single()

  if (error || !action) return false
  if (action.status === "undone") return true

  let ok = false
  switch (action.action_type) {
    case "delete_message":
      ok = !(await supabase
        .from("messages")
        .update({ deleted_at: null, deleted_by: null, deletion_reason: null })
        .eq("id", action.target_id)).error
      break
    case "ban_user":
      ok = !(await supabase
        .from("profiles")
        .update({ banned_at: null, banned_by: null, ban_reason: null })
        .eq("id", action.target_id)).error
      break
    case "freeze_cell":
      ok = !(await supabase
        .from("groups")
        .update({ is_frozen: false, frozen_reason: null, frozen_by: null })
        .eq("id", action.target_id)).error
      break
    case "delete_cell": {
      const snap = (action.before_snapshot ?? {}) as { message_ids?: string[] }
      const r1 = await supabase
        .from("groups")
        .update({ deleted_at: null, deleted_by: null, deletion_reason: null })
        .eq("id", action.target_id)
      ok = !r1.error
      if (ok && snap.message_ids?.length) {
        await supabase
          .from("messages")
          .update({ deleted_at: null, deleted_by: null, deletion_reason: null })
          .in("id", snap.message_ids)
      }
      break
    }
    case "warn_user":
      ok = !(await supabase
        .from("notifications")
        .delete()
        .eq("user_id", action.target_id)
        .eq("type", "system")
        .gte("created_at", action.created_at)).error
      break
    default:
      console.warn("[agents/undo] unknown action_type:", action.action_type)
      return false
  }

  if (!ok) return false

  await supabase
    .from("agent_actions")
    .update({
      status: "undone",
      undone_at: new Date().toISOString(),
      undone_by: ownerId,
    })
    .eq("id", actionId)

  return true
}

export async function listUndoable(limit = 50) {
  const { data } = await SUPABASE()
    .from("agent_actions")
    .select("*")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(limit)
  return data ?? []
}
