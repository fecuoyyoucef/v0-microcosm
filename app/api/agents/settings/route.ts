import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { listAgents } from "@/lib/agents/registry"

export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const supabase = createServiceClient()
  const { data } = await supabase.from("agent_settings").select("*")
  const settings = Object.fromEntries((data ?? []).map((row) => [row.agent_id, row]))

  const merged = listAgents().map((agent) => ({
    ...agent,
    enabled: settings[agent.id]?.enabled ?? true,
    auto_execute: settings[agent.id]?.auto_execute ?? false,
  }))

  return NextResponse.json({ agents: merged })
}

export async function POST(req: Request) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const body = await req.json().catch(() => null)
  if (!body || typeof body.agent_id !== "string") {
    return NextResponse.json({ error: "agent_id is required" }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from("agent_settings")
    .upsert(
      {
        agent_id: body.agent_id,
        enabled: body.enabled ?? true,
        auto_execute: body.auto_execute ?? false,
        updated_at: new Date().toISOString(),
        updated_by: guard.userId,
      },
      { onConflict: "agent_id" },
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
