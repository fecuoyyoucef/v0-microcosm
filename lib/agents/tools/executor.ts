/**
 * Unified tool executor.
 *
 * The runtime calls this with the tool name and parsed arguments. Steps:
 *   1. Look up the policy. If forbidden, refuse. If approval required,
 *      enqueue an approval request and return `requires_approval: true`.
 *   2. Otherwise dispatch to the right backend (GitHub, Supabase, etc.).
 *   3. Annotate the result with the risk level for the audit trail.
 */

import { createServiceClient } from "@/lib/supabase/server"
import { canAutoExecute, getPolicy, getRisk, isForbidden } from "../policy"
import type { ToolResult } from "../types"
import { getGitHubTools } from "./github"
import { getSupabaseTools } from "./database"

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  console.log("[agents] executeTool:", name, args)

  if (isForbidden(name)) {
    return { success: false, error: `Tool "${name}" is forbidden`, risk: "critical" }
  }

  if (!canAutoExecute(name)) {
    const id = await enqueueApproval(name, args)
    return {
      success: false,
      error: `Tool "${name}" requires owner approval`,
      requires_approval: true,
      risk: getRisk(name),
      data: { approval_request_id: id },
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

async function dispatch(
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  // GitHub
  if (name.startsWith("github_") || name === "find_similar_issues") {
    return runGitHub(name, args)
  }
  // Database
  if (name.startsWith("database_")) {
    return runDatabase(name, args)
  }
  // Moderation
  if (name === "moderate_message" || name === "delete_message" || name === "warn_user") {
    return runModeration(name, args)
  }
  // Monitoring
  if (name === "get_system_health" || name === "get_error_logs" || name === "check_performance") {
    return runMonitoring(name, args)
  }
  // Notifications
  if (name === "notify_admin" || name === "create_system_alert") {
    return runNotification(name, args)
  }
  // Analysis (best-effort: just echo back what we know)
  if (name === "analyze_error" || name === "suggest_fix") {
    return {
      success: true,
      data: { note: "Analysis tools rely on model reasoning; nothing to execute server-side.", input: args },
    }
  }

  return { success: false, error: `Unknown tool: ${name}` }
}

// ── Backends ────────────────────────────────────────────────────────────────

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

async function runModeration(name: string, a: Record<string, any>): Promise<ToolResult> {
  const supabase = createServiceClient()
  switch (name) {
    case "moderate_message": {
      const content = (a.content as string).toLowerCase()
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
      const { error } = await supabase.from("agent_audit_logs").insert({
        action: "warn_user",
        details: { user_id: a.user_id, reason: a.reason, severity: a.severity ?? "medium" },
      })
      if (error) return { success: false, error: error.message }
      return { success: true, data: { user_id: a.user_id, warned: true } }
    }
    default:
      return { success: false, error: `Unknown moderation tool: ${name}` }
  }
}

async function runMonitoring(name: string, a: Record<string, any>): Promise<ToolResult> {
  const supabase = createServiceClient()
  const since = timeRangeStart(a.time_range ?? "24h")
  switch (name) {
    case "get_system_health": {
      const [{ count: errors }, { count: decisions }] = await Promise.all([
        supabase.from("error_analysis").select("*", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("agent_decisions").select("*", { count: "exact", head: true }).gte("executed_at", since),
      ])
      return {
        success: true,
        data: {
          time_range: a.time_range ?? "24h",
          error_count: errors ?? 0,
          decision_count: decisions ?? 0,
          status: (errors ?? 0) > 100 ? "warning" : "healthy",
        },
      }
    }
    case "get_error_logs": {
      const { data, error } = await supabase
        .from("error_analysis")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(a.limit ?? 50)
      if (error) return { success: false, error: error.message }
      return { success: true, data: { count: data?.length ?? 0, logs: data } }
    }
    default:
      return { success: true, data: { message: "Not implemented yet" } }
  }
}

async function runNotification(name: string, a: Record<string, any>): Promise<ToolResult> {
  const supabase = createServiceClient()
  if (name === "notify_admin") {
    await supabase.from("agent_audit_logs").insert({
      action: "notify_admin",
      details: { title: a.title, message: a.message, priority: a.priority ?? "medium" },
    })
    return { success: true, data: { notified: true, title: a.title } }
  }
  if (name === "create_system_alert") {
    await supabase.from("monitoring_events").insert({
      event_type: a.alert_type,
      event_data: { description: a.description, ...(a.data ?? {}) },
    })
    return { success: true, data: { alert_created: true } }
  }
  return { success: false, error: `Unknown notification tool: ${name}` }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function enqueueApproval(toolName: string, args: Record<string, unknown>): Promise<string> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from("approval_requests")
    .insert({
      action: toolName,
      details: args,
      description: `Agent requested to run ${toolName}`,
      risk_level: getRisk(toolName),
      requested_by: "agent",
      status: "pending",
    })
    .select("id")
    .single()
  return data?.id ?? "unknown"
}

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

export { getPolicy }
