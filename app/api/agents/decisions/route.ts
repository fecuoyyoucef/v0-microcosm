/**
 * GET /api/agents/decisions
 *
 * Returns recent agent runs (the unified replacement for the old
 * `agent_decisions` table). Optional `agent` and `limit` query params.
 */

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/agents/auth"
import { createServiceClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200)
  const agentId = searchParams.get("agent")

  const supabase = createServiceClient()
  let q = supabase
    .from("agent_runs")
    .select(
      "id, agent_id, trigger, status, steps, tokens_used, duration_ms, started_at, finished_at, output, error",
    )
    .order("started_at", { ascending: false })
    .limit(limit)
  if (agentId) q = q.eq("agent_id", agentId)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ runs: data ?? [] })
}
