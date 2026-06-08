/**
 * GET /api/agents/runs?agent=chief&limit=50
 * Recent run history with their tool calls.
 */

import { requireAdmin } from "@/lib/agents/auth"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (auth.response) return auth.response

  const url = new URL(req.url)
  const agent = url.searchParams.get("agent")
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200)

  const svc = createServiceClient()
  let query = svc
    .from("agent_runs")
    .select("*, agent_tool_calls(*)")
    .order("started_at", { ascending: false })
    .limit(limit)

  if (agent) query = query.eq("agent_id", agent)

  const { data, error } = await query
  if (error) {
    console.error("[agents:runs] query error:", error)
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ runs: data ?? [] })
}
