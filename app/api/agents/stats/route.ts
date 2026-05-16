import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/require-admin"

export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const supabase = createServiceClient()
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [decisions, approvals, actions, errors] = await Promise.all([
    supabase
      .from("agent_decisions")
      .select("agent_id, severity, confidence, created_at")
      .gte("created_at", since),
    supabase.from("approval_requests").select("status, risk_level, created_at").gte("created_at", since),
    supabase.from("agent_actions").select("action_type, status, created_at").gte("created_at", since),
    supabase
      .from("agent_runs")
      .select("agent_id, ok, total_tokens, duration_ms, created_at")
      .gte("created_at", since),
  ])

  return NextResponse.json({
    range: { since, until: new Date().toISOString() },
    decisions: decisions.data ?? [],
    approvals: approvals.data ?? [],
    actions: actions.data ?? [],
    runs: errors.data ?? [],
  })
}
