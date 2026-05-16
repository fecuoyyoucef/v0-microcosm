/**
 * GET /api/agents/metrics — high-level dashboard metrics for the last 24h.
 */

import { requireAdmin } from "@/lib/agents/auth"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET() {
  const auth = await requireAdmin()
  if (auth.response) return auth.response

  const svc = createServiceClient()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [runsRes, toolsRes, pendingRes] = await Promise.all([
    svc
      .from("agent_runs")
      .select("agent_id, status, tokens_used, duration_ms, started_at")
      .gte("started_at", since),
    svc
      .from("agent_tool_calls")
      .select("tool_name, success")
      .gte("created_at", since),
    svc
      .from("agent_approvals")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ])

  const runs = runsRes.data ?? []
  const toolCalls = toolsRes.data ?? []

  const byAgent: Record<string, { total: number; failed: number; tokens: number }> = {}
  for (const r of runs) {
    const a = r.agent_id
    byAgent[a] ??= { total: 0, failed: 0, tokens: 0 }
    byAgent[a].total++
    if (r.status === "failed") byAgent[a].failed++
    byAgent[a].tokens += r.tokens_used ?? 0
  }

  const byTool: Record<string, { total: number; failed: number }> = {}
  for (const t of toolCalls) {
    byTool[t.tool_name] ??= { total: 0, failed: 0 }
    byTool[t.tool_name].total++
    if (!t.success) byTool[t.tool_name].failed++
  }

  const totalRuns = runs.length
  const failedRuns = runs.filter((r) => r.status === "failed").length
  const totalTokens = runs.reduce((s, r) => s + (r.tokens_used ?? 0), 0)
  const avgDuration =
    totalRuns === 0
      ? 0
      : Math.round(
          runs.reduce((s, r) => s + (r.duration_ms ?? 0), 0) / totalRuns,
        )

  return Response.json({
    window_hours: 24,
    totals: {
      runs: totalRuns,
      failed_runs: failedRuns,
      success_rate: totalRuns === 0 ? 1 : 1 - failedRuns / totalRuns,
      tokens: totalTokens,
      avg_duration_ms: avgDuration,
      pending_approvals: pendingRes.count ?? 0,
    },
    by_agent: byAgent,
    by_tool: byTool,
  })
}
