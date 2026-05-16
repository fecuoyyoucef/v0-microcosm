/**
 * Persistence layer for agent runs and tool executions.
 *
 * Writes to the unified schema (`agent_runs`, `agent_tool_calls`) using
 * the service-role Supabase client. All calls are best-effort: a logging
 * failure must NEVER break a live run.
 */

import { createServiceClient } from "@/lib/supabase/server"
import type { AgentRun, ToolResult } from "./types"

/** Create a run row in `running` state. Returns the row id (== run.id). */
export async function startRun(input: {
  runId: string
  agentId: string
  trigger: string
  inputData: unknown
  userId?: string | null
}): Promise<void> {
  const svc = createServiceClient()
  const { error } = await svc.from("agent_runs").insert({
    id: input.runId,
    agent_id: input.agentId,
    user_id: input.userId ?? null,
    trigger: input.trigger,
    input: input.inputData ?? {},
    status: "running",
  })
  if (error) console.error("[agents/monitoring] startRun:", error.message)
}

/** Mark a run as finished (completed/failed/cancelled) and save its output. */
export async function finishRun(run: AgentRun, context?: string): Promise<void> {
  const svc = createServiceClient()
  const { error } = await svc
    .from("agent_runs")
    .update({
      output: {
        text: run.output,
        tool_calls: run.tool_calls,
        context: context ?? null,
      },
      status: run.success ? "completed" : "failed",
      steps: run.iterations,
      tokens_used: run.tokens_in + run.tokens_out,
      duration_ms: run.duration_ms,
      error: run.error ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", run.id)
  if (error) console.error("[agents/monitoring] finishRun:", error.message)
}

/** Backwards-compatible alias kept for any external callers. */
export const logRun = finishRun

export async function logToolExecution(input: {
  runId: string
  agentId: string
  toolName: string
  args: unknown
  result: ToolResult
  durationMs?: number
}): Promise<void> {
  const svc = createServiceClient()
  const { error } = await svc.from("agent_tool_calls").insert({
    run_id: input.runId,
    agent_id: input.agentId,
    tool_name: input.toolName,
    arguments: (input.args as object) ?? {},
    result: input.result.data ?? input.result,
    success: input.result.success,
    error: input.result.error ?? null,
    duration_ms: input.durationMs ?? null,
    required_approval: input.result.requires_approval ?? false,
  })
  if (error) console.error("[agents/monitoring] logToolExecution:", error.message)
}
