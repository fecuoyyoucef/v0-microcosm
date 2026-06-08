/**
 * Unified tool executor.
 *
 * Steps for every call:
 *   1. Validate the tool is registered and not forbidden.
 *   2. Check policy: if it needs owner approval AND we're not already in a
 *      pre-approved bypass, enqueue an approval row and return early.
 *   3. Otherwise dispatch to the right backend (GitHub, Supabase, etc.).
 *   4. Annotate the result with the policy's risk level for the audit trail.
 *
 * The executor never trusts the model to decide `auto_execute` — every
 * destructive action is gated by `lib/agents/policy.ts`.
 */

import { createServiceClient } from "@/lib/supabase/server"
import { enqueueApproval } from "../approvals"
import { canAutoExecute, getRisk, isForbidden } from "../policy"
import type { ToolResult } from "../types"
import { getGitHubTools } from "./github"
import { getSupabaseTools } from "./database"

export interface ExecuteOptions {
  /** When true, skip the approval gate (used by `executeApproved`). */
  preApproved?: boolean
  /** Agent invoking the tool — used for approval audit. */
  agentId?: string
  /** Run id — used to link approvals to the originating run. */
  runId?: string
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  opts: ExecuteOptions = {},
): Promise<ToolResult> {
  console.log("[agents] executeTool:", name, args)

  if (isForbidden(name)) {
    return { success: false, error: `Tool "${name}" is forbidden`, risk: "critical" }
  }

  if (!opts.preApproved && !canAutoExecute(name)) {
    try {
      const id = await enqueueApproval({
        agentId: opts.agentId ?? "chief",
        toolName: name,
        args,
        runId: opts.runId,
      })
      return {
        success: false,
        error: `Tool "${name}" requires owner approval`,
        requires_approval: true,
        risk: getRisk(name),
        data: { approval_request_id: id },
      }
    } catch (err) {
      return {
        success: false,
        error: `Approval enqueue failed: ${err instanceof Error ? err.message : String(err)}`,
        risk: getRisk(name),
      }
    }
  }

  try {
    const raw = await dispatch(name, args)
    return { ...raw, risk: getRisk(name) }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      risk: getRisk(name),
    }
  }
}

// ── Dispatch ────────────────────────────────────────────────────────────────

async function dispatch(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  if (name.startsWith("github_") || name === "find_similar_issues") return runGitHub(name, args)
  if (name.startsWith("database_")) return runDatabase(name, args)
  if (name === "moderate_message" || name === "delete_message" || name === "warn_user") {
    return runModeration(name, args)
  }
  if (name === "get_system_health" || name === "get_error_logs") return runMonitoring(name, args)
  if (name === "notify_admin" || name === "create_system_alert") return runNotification(name, args)
  if (name === "analyze_error" || name === "suggest_fix") {
    return { success: true, data: { note: "Analysis is pure model reasoning.", input: args } }
  }
  return { success: false, error: `Unknown tool: ${name}` }
}

// ── GitHub ──────────────────────────────────────────────────────────────────

async function runGitHub(name: string, a: Record<string, any>): Promise<ToolResult> {
  const gh = getGitHubTools()
  switch (name) {
    case "github_read_file":
      return gh.readFile(a.path, a.ref)
    case "github_search_code":
      return gh.searchCode(a.query, a.extension)
    case "github_list_files":
      return gh.listFiles(a.path)
    case "github_create_issue":
      return gh.createIssue({ title: a.title, body: a.body, labels: a.labels, assignees: a.assignees })
    case "github_comment_on_issue":
      return gh.commentOnIssue(a.issue_number, a.comment)
    case "github_close_issue":
      return gh.closeIssue(a.issue_number, a.comment)
    case "github_create_pull_request":
      return gh.createPullRequest({ title: a.title, body: a.body, head: a.head, base: a.base })
    case "github_get_commit_history":
      return gh.getCommitHistory(a.path, a.limit)
    case "github_get_security_alerts":
      return gh.getSecurityAlerts()
    case "find_similar_issues":
      return gh.searchIssues(a.query, a.state ?? "all")
    default:
      return { success: false, error: `Unknown GitHub tool: ${name}` }
  }
}

// ── Database ────────────────────────────────────────────────────────────────

async function runDatabase(name: string, a: Record<string, any>): Promise<ToolResult> {
  const db = getSupabaseTools()
  switch (name) {
    case "database_query":
      return db.query({ table: a.table, select: a.select, filters: a.filters, limit: a.limit, order_by: a.order_by })
    case "database_insert":
      return db.insert({ table: a.table, data: a.data })
    case "database_update":
      return db.update({ table: a.table, filters: a.filters, data: a.data })
    case "database_delete":
      return db.delete({ table: a.table, filters: a.filters })
    case "database_rpc":
      return db.rpc({ function_name: a.function_name, params: a.params })
    default:
      return { success: false, error: `Unknown database tool: ${name}` }
  }
}

// ── Moderation ──────────────────────────────────────────────────────────────

async function runModeration(name: string, a: Record<string, any>): Promise<ToolResult> {
  const supabase = createServiceClient()
  switch (name) {
    case "moderate_message": {
      // Lightweight keyword screen; the model does the real reasoning above.
      const content = String(a.content ?? "").toLowerCase()
      const flags = ["spam", "scam", "hate", "abuse"].filter((w) => content.includes(w))
      return {
        success: true,
        data: {
          message_id: a.message_id,
          is_appropriate: flags.length === 0,
          flags,
          recommendation: flags.length > 0 ? "delete" : "approve",
        },
      }
    }
    case "delete_message": {
      const { error } = await supabase.from("messages").delete().eq("id", a.message_id)
      if (error) return { success: false, error: error.message }
      return { success: true, data: { message_id: a.message_id, reason: a.reason } }
    }
    case "warn_user": {
      // Record the warning in agent memory so the support agent can see it.
      const { error } = await supabase.from("agent_memory").insert({
        agent_id: "moderator",
        key: `warning:${a.user_id}:${Date.now()}`,
        value: { user_id: a.user_id, reason: a.reason, severity: a.severity ?? "medium" },
        scope: "user",
        scope_id: a.user_id,
      })
      if (error) return { success: false, error: error.message }
      return { success: true, data: { user_id: a.user_id, warned: true } }
    }
    default:
      return { success: false, error: `Unknown moderation tool: ${name}` }
  }
}

// ── Monitoring ──────────────────────────────────────────────────────────────

async function runMonitoring(name: string, a: Record<string, any>): Promise<ToolResult> {
  const supabase = createServiceClient()
  const since = timeRangeStart(a.time_range ?? "24h")
  switch (name) {
    case "get_system_health": {
      const [runs, fails] = await Promise.all([
        supabase.from("agent_runs").select("*", { count: "exact", head: true }).gte("started_at", since),
        supabase
          .from("agent_runs")
          .select("*", { count: "exact", head: true })
          .eq("status", "failed")
          .gte("started_at", since),
      ])
      const total = runs.count ?? 0
      const failed = fails.count ?? 0
      return {
        success: true,
        data: {
          time_range: a.time_range ?? "24h",
          total_runs: total,
          failed_runs: failed,
          success_rate: total === 0 ? 1 : 1 - failed / total,
          status: failed > total * 0.2 ? "warning" : "healthy",
        },
      }
    }
    case "get_error_logs": {
      const { data, error } = await supabase
        .from("agent_runs")
        .select("id, agent_id, error, started_at")
        .eq("status", "failed")
        .gte("started_at", since)
        .order("started_at", { ascending: false })
        .limit(a.limit ?? 50)
      if (error) return { success: false, error: error.message }
      return { success: true, data: { count: data?.length ?? 0, logs: data ?? [] } }
    }
    default:
      return { success: true, data: { message: "Not implemented" } }
  }
}

// ── Notifications ───────────────────────────────────────────────────────────

async function runNotification(name: string, a: Record<string, any>): Promise<ToolResult> {
  const supabase = createServiceClient()
  // We don't have a notifications-for-admins table, so we surface alerts as
  // entries in `agent_memory` under a global scope. The dashboard reads these.
  await supabase.from("agent_memory").insert({
    agent_id: "chief",
    key: `${name}:${Date.now()}`,
    value: { title: a.title ?? a.alert_type, message: a.message ?? a.description, priority: a.priority ?? "medium" },
    scope: "global",
    scope_id: null,
  })
  return { success: true, data: { delivered: true } }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function timeRangeStart(range: string): string {
  const d = new Date()
  switch (range) {
    case "1h":
      d.setHours(d.getHours() - 1)
      break
    case "7d":
      d.setDate(d.getDate() - 7)
      break
    case "30d":
      d.setDate(d.getDate() - 30)
      break
    case "24h":
    default:
      d.setHours(d.getHours() - 24)
  }
  return d.toISOString()
}
