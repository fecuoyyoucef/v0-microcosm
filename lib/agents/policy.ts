/**
 * Tool policy: who can auto-execute what.
 *
 * Critically, this is decided **server-side** by tool name, never by the
 * model. The model can suggest, but the policy is the source of truth.
 *
 * - "auto": Always execute without approval.
 * - "approve": Always require a human approval row in agent_approval_requests.
 * - "forbidden": Refuse outright.
 *
 * Risk levels feed into the audit log and the admin UI.
 */

import type { RiskLevel } from "./types"

export type ExecMode = "auto" | "approve" | "forbidden"

interface ToolPolicy {
  mode: ExecMode
  risk: RiskLevel
}

const POLICIES: Record<string, ToolPolicy> = {
  // ── Read-only: always safe ───────────────────────────────────────────────
  database_query: { mode: "auto", risk: "low" },
  github_read_file: { mode: "auto", risk: "low" },
  github_search_code: { mode: "auto", risk: "low" },
  github_list_files: { mode: "auto", risk: "low" },
  github_get_commit_history: { mode: "auto", risk: "low" },
  github_get_security_alerts: { mode: "auto", risk: "low" },
  get_system_health: { mode: "auto", risk: "low" },
  get_error_logs: { mode: "auto", risk: "low" },
  check_performance: { mode: "auto", risk: "low" },
  find_similar_issues: { mode: "auto", risk: "low" },
  analyze_error: { mode: "auto", risk: "low" },
  suggest_fix: { mode: "auto", risk: "low" },
  moderate_message: { mode: "auto", risk: "low" },

  // ── Light write actions, auto OK ─────────────────────────────────────────
  notify_admin: { mode: "auto", risk: "low" },
  create_system_alert: { mode: "auto", risk: "low" },
  warn_user: { mode: "auto", risk: "medium" },
  github_comment_on_issue: { mode: "auto", risk: "low" },

  // ── Medium-risk: configurable, default auto for now ──────────────────────
  github_create_issue: { mode: "auto", risk: "medium" },
  delete_message: { mode: "auto", risk: "medium" },

  // ── High-risk: require approval ──────────────────────────────────────────
  database_insert: { mode: "approve", risk: "high" },
  database_update: { mode: "approve", risk: "high" },
  database_delete: { mode: "approve", risk: "critical" },
  database_rpc: { mode: "approve", risk: "high" },
  github_close_issue: { mode: "approve", risk: "medium" },
  github_create_pull_request: { mode: "approve", risk: "high" },
  ban_user: { mode: "approve", risk: "critical" },
}

const DEFAULT_POLICY: ToolPolicy = { mode: "approve", risk: "medium" }

export function getPolicy(toolName: string): ToolPolicy {
  return POLICIES[toolName] ?? DEFAULT_POLICY
}

export function canAutoExecute(toolName: string): boolean {
  return getPolicy(toolName).mode === "auto"
}

export function getRisk(toolName: string): RiskLevel {
  return getPolicy(toolName).risk
}

export function isForbidden(toolName: string): boolean {
  return getPolicy(toolName).mode === "forbidden"
}
