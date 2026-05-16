import { createServiceClient } from "@/lib/supabase/server"

/**
 * Undo system — every reversible agent action snapshots the affected row into
 * `agent_snapshots.before_state` before mutating. An admin can later replay the
 * snapshot to restore the original state.
 */

const SUPABASE = () => createServiceClient()

export async function recordSnapshot(params: {
  run_id?: string | null
  agent_id: string
  resource_type: string
  resource_id: string
  before_state: Record<string, unknown>
}): Promise<string | null> {
  const { data, error } = await SUPABASE()
    .from("agent_snapshots")
    .insert({
      run_id: params.run_id ?? null,
      agent_id: params.agent_id,
      resource_type: params.resource_type,
      resource_id: params.resource_id,
      before_state: params.before_state,
      reverted: false,
    })
    .select("id")
    .single()

  if (error) {
    console.error("[agents/undo] recordSnapshot failed:", error.message)
    return null
  }
  return data.id
}

/**
 * Revert a snapshot. Maps `resource_type` to the table to update; the entire
 * `before_state` JSON is written back as the new row contents.
 */
export async function undoAction(snapshotId: string, _adminId: string): Promise<boolean> {
  const supabase = SUPABASE()

  const { data: snap, error } = await supabase
    .from("agent_snapshots")
    .select("*")
    .eq("id", snapshotId)
    .single()

  if (error || !snap) return false
  if (snap.reverted) return true

  const table = TABLE_FOR_RESOURCE[snap.resource_type as keyof typeof TABLE_FOR_RESOURCE]
  if (!table) {
    console.warn("[agents/undo] unsupported resource_type:", snap.resource_type)
    return false
  }

  const before = (snap.before_state ?? {}) as Record<string, unknown>
  // Drop the primary key from the update payload — it's used in the WHERE.
  const { id: _ignored, ...payload } = before

  const { error: updErr } = await supabase
    .from(table)
    .update(payload)
    .eq("id", snap.resource_id)

  if (updErr) {
    console.error("[agents/undo] revert failed:", updErr.message)
    return false
  }

  await supabase
    .from("agent_snapshots")
    .update({ reverted: true })
    .eq("id", snapshotId)

  return true
}

export async function listUndoable(limit = 50) {
  const { data } = await SUPABASE()
    .from("agent_snapshots")
    .select("id, agent_id, resource_type, resource_id, created_at, reverted")
    .eq("reverted", false)
    .order("created_at", { ascending: false })
    .limit(limit)
  return data ?? []
}

const TABLE_FOR_RESOURCE = {
  message: "messages",
  profile: "profiles",
  group: "groups",
  notification: "notifications",
} as const
