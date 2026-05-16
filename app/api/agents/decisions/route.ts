import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/require-admin"

export async function GET(req: Request) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200)
  const agentId = searchParams.get("agent")

  const supabase = createServiceClient()
  let q = supabase
    .from("agent_decisions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (agentId) q = q.eq("agent_id", agentId)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ decisions: data })
}
