/**
 * POST /api/agents/run
 *
 * Body: { agent: AgentKind, input: string, context?: Record<string, unknown> }
 *
 * Dispatches to the correct agent's entry function and returns the full
 * AgentRun (tool calls, tokens, duration, success/error).
 */

import { requireAdmin } from "@/lib/agents/auth"
import {
  askChief,
  moderate,
  support as supportAgent,
  analyze,
  diagnose,
  AGENTS,
  type AgentKind,
} from "@/lib/agents"

const VALID_AGENTS = Object.keys(AGENTS) as AgentKind[]

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (auth.response) return auth.response

  let body: { agent?: string; input?: string; context?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const agent = body.agent as AgentKind | undefined
  const input = (body.input ?? "").trim()

  if (!agent || !VALID_AGENTS.includes(agent)) {
    return Response.json(
      { error: `Unknown agent. Valid: ${VALID_AGENTS.join(", ")}` },
      { status: 400 },
    )
  }
  if (!input) {
    return Response.json({ error: "Input is required" }, { status: 400 })
  }

  try {
    const run = await dispatch(agent, input, auth.userId!, body.context)
    return Response.json({ run })
  } catch (err) {
    console.error("[agents:run] failed:", err)
    return Response.json(
      { error: err instanceof Error ? err.message : "Agent run failed" },
      { status: 500 },
    )
  }
}

async function dispatch(
  agent: AgentKind,
  input: string,
  userId: string,
  context?: Record<string, unknown>,
) {
  switch (agent) {
    case "chief":
      return askChief({ input, userId, context })
    case "moderator":
      return moderate({ input, userId, context })
    case "support":
      return supportAgent({ input, userId, context })
    case "analyst":
      return analyze({ input, userId, context })
    case "developer":
      return diagnose({ input, userId, context })
  }
}
