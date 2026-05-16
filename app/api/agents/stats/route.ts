/**
 * GET /api/agents/stats
 *
 * Aggregate counters for the admin dashboard, all queried with
 * count-only requests (head: true) so we never pull row data.
 */

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/agents/auth"
import { createServiceClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const supabase = createServiceClient()
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [total, last24, failed24, pending, running] = await Promise.all([
    supabase.from("agent_runs").select("id", { count: "exact", head: true }),
    supabase
      .from("agent_runs")
      .select("id", { count: "exact", head: true })
      .gte("started_at", since24h),
    supabase
      .from("agent_runs")
      .select("id", { count: "exact", head: true })
      .gte("started_at", since24h)
      .eq("status", "failed"),
    supabase
      .from("agent_approvals")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("agent_runs")
      .select("id", { count: "exact", head: true })
      .eq("status", "running"),
  ])

  const runs24h = last24.count ?? 0
  const failures24h = failed24.count ?? 0

  return NextResponse.json({
    total_runs: total.count ?? 0,
    runs_24h: runs24h,
    failed_24h: failures24h,
    in_progress: running.count ?? 0,
    pending_approvals: pending.count ?? 0,
    success_rate_24h:
      runs24h > 0 ? Math.round(((runs24h - failures24h) / runs24h) * 100) : null,
  })
}
