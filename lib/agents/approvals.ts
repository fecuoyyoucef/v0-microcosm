import { createServiceClient } from "@/lib/supabase/server"
import { assessRisk, requiresApproval } from "./policy"
import { executeTool } from "./tools/executor"
import type { ApprovalRequest, ToolResult } from "./types"

/**
 * Approval system for high-risk agent actions.
 *
 * The flow is:
 *   1. Agent (or runtime) calls `requestApproval(action, args)`.
 *   2. Low-risk auto-executable actions get an auto-approved record.
 *   3. Anything else is inserted into `approval_requests` with status="pending"
 *      and the owner is notified.
 *   4. Owner approves/rejects via UI; `executeApprovedAction` finalizes it.
 */

const SUPABASE = () => createServiceClient()

function describe(action: string, args: Record<string, unknown>): string {
  // Lightweight human-readable description — kept in one place so the admin
  // UI always shows consistent wording.
  const a = args as Record<string, string>
  switch (action) {
    case "ban_user":
      return `حظر المستخدم ${a.user_id} (${a.duration_hours ? `${a.duration_hours} ساعة` : "دائم"})`
    case "delete_message":
      return `حذف الرسالة ${a.message_id}`
    case "delete_cell":
      return `حذف الخلية ${a.cell_id}`
    case "freeze_cell":
      return `تجميد الخلية ${a.cell_id}`
    case "warn_user":
      return `تحذير المستخدم ${a.user_id}: ${a.reason ?? ""}`
    case "create_github_issue":
      return `إنشاء GitHub issue: ${a.title}`
    case "merge_pr":
      return `دمج Pull Request #${a.pr_number}`
    default:
      return `${action} — ${JSON.stringify(args).slice(0, 200)}`
  }
}

export async function requestApproval(
  action: string,
  args: Record<string, unknown>,
  requestedBy = "chief_agent",
): Promise<ApprovalRequest> {
  const supabase = SUPABASE()
  const risk = assessRisk(action, args)
  const needsApproval = requiresApproval(action, args)

  if (!needsApproval) {
    // Auto-approve: still record it for auditability but mark approved.
    const { data, error } = await supabase
      .from("approval_requests")
      .insert({
        action,
        description: describe(action, args),
        risk_level: risk,
        requested_by: requestedBy,
        details: args,
        status: "approved",
        approved_by: "system_auto",
        approved_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw new Error(`Auto-approve insert failed: ${error.message}`)
    return data as ApprovalRequest
  }

  const { data, error } = await supabase
    .from("approval_requests")
    .insert({
      action,
      description: describe(action, args),
      risk_level: risk,
      requested_by: requestedBy,
      details: args,
      status: "pending",
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create approval request: ${error.message}`)
  return data as ApprovalRequest
}

export async function approve(requestId: string, approvedBy: string): Promise<void> {
  const { error } = await SUPABASE()
    .from("approval_requests")
    .update({ status: "approved", approved_by: approvedBy, approved_at: new Date().toISOString() })
    .eq("id", requestId)
  if (error) throw new Error(`Failed to approve: ${error.message}`)
}

export async function reject(requestId: string, rejectedBy: string): Promise<void> {
  const { error } = await SUPABASE()
    .from("approval_requests")
    .update({ status: "rejected", approved_by: rejectedBy, approved_at: new Date().toISOString() })
    .eq("id", requestId)
  if (error) throw new Error(`Failed to reject: ${error.message}`)
}

export async function listPendingApprovals(): Promise<ApprovalRequest[]> {
  const { data, error } = await SUPABASE()
    .from("approval_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
  if (error) {
    console.error("[agents/approvals] list pending failed:", error)
    return []
  }
  return (data ?? []) as ApprovalRequest[]
}

export async function executeApprovedAction(requestId: string, executedBy: string): Promise<ToolResult> {
  const supabase = SUPABASE()

  const { data: request, error } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("id", requestId)
    .single()

  if (error || !request) return { success: false, error: "Approval request not found" }
  if (request.status !== "approved") return { success: false, error: "Request is not approved" }
  if (request.executed_at) return { success: false, error: "Already executed" }

  const result = await executeTool(request.action, (request.details ?? {}) as Record<string, unknown>, {
    actor: executedBy,
    approved: true,
  })

  await supabase
    .from("approval_requests")
    .update({
      executed_at: new Date().toISOString(),
      execution_result: result,
    })
    .eq("id", requestId)

  return result
}
