/**
 * Approval system for high-risk agent actions.
 *
 * Flow:
 *   1. Runtime's executor calls `enqueueApproval(...)` when the policy says
 *      the tool requires owner consent.
 *   2. Owner approves/rejects via /api/agents/approvals.
 *   3. `executeApproved(id)` re-runs the tool with the recorded arguments.
 *
 * Writes go through the service-role client so they bypass RLS; reads are
 * filtered server-side by the API routes that already enforce `requireAdmin`.
 */

import { createServiceClient } from "@/lib/supabase/server"
import { getRisk } from "./policy"
import { executeTool } from "./tools/executor"
import type { RiskLevel, ToolResult } from "./types"

export interface ApprovalRow {
  id: string
  run_id: string | null
  agent_id: string
  tool_name: string
  arguments: Record<string, unknown>
  risk_level: RiskLevel
  status: "pending" | "approved" | "rejected" | "expired"
  reason: string | null
  requested_at: string
  decided_at: string | null
  decided_by: string | null
  expires_at: string
}

export async function enqueueApproval(input: {
  agentId: string
  toolName: string
  args: Record<string, unknown>
  runId?: string
  reason?: string
}): Promise<string> {
  const svc = createServiceClient()
  const { data, error } = await svc
    .from("agent_approvals")
    .insert({
      run_id: input.runId ?? null,
      agent_id: input.agentId,
      tool_name: input.toolName,
      arguments: input.args,
      risk_level: getRisk(input.toolName),
      reason: input.reason ?? null,
      status: "pending",
    })
    .select("id")
    .single()

  if (error || !data) {
    throw new Error(`Failed to enqueue approval: ${error?.message ?? "unknown"}`)
  }
  return data.id
}

export async function listPending(limit = 100): Promise<ApprovalRow[]> {
  const svc = createServiceClient()
  const { data, error } = await svc
    .from("agent_approvals")
    .select("*")
    .eq("status", "pending")
    .order("requested_at", { ascending: false })
    .limit(limit)
  if (error) {
    console.error("[agents/approvals] listPending:", error)
    return []
  }
  return (data ?? []) as ApprovalRow[]
}

export async function decide(input: {
  id: string
  decision: "approved" | "rejected"
  decidedBy: string
  reason?: string
}): Promise<ApprovalRow | null> {
  const svc = createServiceClient()
  const { data, error } = await svc
    .from("agent_approvals")
    .update({
      status: input.decision,
      decided_by: input.decidedBy,
      decided_at: new Date().toISOString(),
      reason: input.reason ?? null,
    })
    .eq("id", input.id)
    .eq("status", "pending")
    .select()
    .single()

  if (error) {
    console.error("[agents/approvals] decide:", error)
    return null
  }
  return data as ApprovalRow
}

export async function executeApproved(id: string): Promise<ToolResult> {
  const svc = createServiceClient()
  const { data: row, error } = await svc
    .from("agent_approvals")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !row) return { success: false, error: "Approval not found" }
  if (row.status !== "approved") return { success: false, error: "Not approved" }

  // Pre-approved bypass so the executor doesn't re-enqueue.
  const result = await executeTool(row.tool_name, row.arguments ?? {}, { preApproved: true })

  return result
}
