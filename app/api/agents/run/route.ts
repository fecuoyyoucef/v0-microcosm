import { NextResponse } from "next/server"
import { runAgent } from "@/lib/agents/runtime"
import type { AgentId } from "@/lib/agents/types"
import { listAgents } from "@/lib/agents/registry"
import { requireAdmin } from "@/lib/auth/require-admin"

const VALID: AgentId[] = ["chief", "moderator", "support", "analyst", "developer"]

export async function POST(req: Request) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const body = await req.json().catch(() => null)
  if (!body || typeof body.scenario !== "string") {
    return NextResponse.json({ error: "scenario is required" }, { status: 400 })
  }

  const agentId = (body.agent ?? "chief") as AgentId
  if (!VALID.includes(agentId)) {
    return NextResponse.json({ error: `Unknown agent: ${agentId}` }, { status: 400 })
  }

  const result = await runAgent(agentId, body.scenario, body.context ?? {}, {
    actorId: guard.userId,
    maxSteps: typeof body.max_steps === "number" ? body.max_steps : undefined,
  })

  return NextResponse.json(result)
}

export async function GET() {
  return NextResponse.json({ agents: listAgents() })
}
