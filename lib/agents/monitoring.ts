/**
 * Persistence layer for agent runs and tool executions.
 *
 * Writes to the existing `agent_decisions` and `tool_executions` tables
 * using the service-role Supabase client. Failures here must never break
 * the run itself — they're best-effort observability.
 */

import { createServiceClient } from "@/lib/supabase/server"
import type { AgentRun, ToolResult } from "./types"

export async function logRun(run: AgentRun, context?: string): Promise<void> {
  const supabase = createServiceClient()

  await supabase.from("agent_decisions").insert({
    id: run.id,
    agent_type: run.agent,
    user_message: run.input,
    decision: run.output ?? "",
    reasoning: null,
    tool_calls: run.tool_calls,
    model_used: run.model,
    tokens_used: run.tokens_in + run.tokens_out,
    execution_time_ms: run.duration_ms,
    success: run.success,
    error_message: run.error ?? null,
    context: context ?? null,
    metadata: {
      iterations: run.iterations,
      tokens_in: run.tokens_in,
      tokens_out: run.tokens_out,
      user_id: run.user_id,
    },
  })
}

export async function logToolExecution(input: {
  runId: string
  toolName: string
  args: unknown
  result: ToolResult
}): Promise<void> {
  const supabase = createServiceClient()

  await supabase.from("tool_executions").insert({
    decision_id: input.runId,
    tool_name: input.toolName,
    tool_category: categoryFor(input.toolName),
    args: input.args,
    result: input.result.data ?? null,
    success: input.result.success,
    error_message: input.result.error ?? null,
    execution_time_ms: 0,
    retries: 0,
  })
}

function categoryFor(toolName: string): string {
  if (toolName.startsWith("github_")) return "github"
  if (toolName.startsWith("database_")) return "database"
  if (toolName === "moderate_message" || toolName === "delete_message" || toolName === "warn_user" || toolName === "ban_user") {
    return "moderation"
  }
  if (toolName.startsWith("notify_") || toolName.startsWith("create_system")) {
    return "notification"
  }
  if (toolName.startsWith("get_") || toolName.startsWith("check_")) return "monitoring"
  if (toolName.startsWith("analyze_") || toolName.startsWith("suggest_") || toolName.startsWith("find_")) {
    return "analysis"
  }
  return "other"
}
